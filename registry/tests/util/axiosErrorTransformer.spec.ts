import { AxiosError, AxiosHeaders } from 'axios';
import { expect } from 'chai';
import { axiosErrorTransformer, isAxiosError } from '../../server/util/axiosErrorTransformer';
import { sanitizeHeaders, truncateBody } from '../../server/util/helpers';

describe('axiosErrorTransformer', () => {
    describe('isAxiosError', () => {
        it('should return true for AxiosError', () => {
            const error = new Error('test') as AxiosError;
            error.isAxiosError = true;
            expect(isAxiosError(error)).to.be.true;
        });

        it('should return false for regular Error', () => {
            const error = new Error('test');
            expect(isAxiosError(error)).to.be.false;
        });

        it('should return false for null/undefined', () => {
            expect(isAxiosError(null)).to.be.false;
            expect(isAxiosError(undefined)).to.be.false;
        });
    });

    describe('sanitizeHeaders', () => {
        it('should exclude sensitive headers', () => {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
                Cookie: 'session=abc123',
                'X-API-Key': 'secret-key',
                'x-auth-token': 'auth-token',
            };

            const sanitized = sanitizeHeaders(headers);

            expect(sanitized).to.deep.equal({
                'Content-Type': 'application/json',
            });
        });

        it('should handle case-insensitive header names', () => {
            const headers = {
                AUTHORIZATION: 'Bearer token',
                'set-cookie': 'session=123',
                'PROXY-AUTHORIZATION': 'Basic xyz',
            };

            const sanitized = sanitizeHeaders(headers);

            expect(sanitized).to.deep.equal({});
        });

        it('should return undefined for null/undefined headers', () => {
            expect(sanitizeHeaders(undefined)).to.be.undefined;
            expect(sanitizeHeaders(null as any)).to.be.undefined;
        });

        it('should handle empty headers object', () => {
            expect(sanitizeHeaders({})).to.deep.equal({});
        });
    });

    describe('truncateBody', () => {
        it('should not truncate short strings', () => {
            const result = truncateBody('short string');
            expect(result).to.deep.equal({ content: 'short string' });
        });

        it('should truncate long strings', () => {
            const longString = 'a'.repeat(1500);
            const result = truncateBody(longString);

            expect(result.content).to.have.length(1000);
            expect(result.truncated).to.be.true;
            expect(result.length).to.equal(1500);
        });

        it('should handle objects', () => {
            const obj = { key: 'value', nested: { a: 1 } };
            const result = truncateBody(obj);

            expect(result.content).to.deep.equal(obj);
            expect(result.truncated).to.be.undefined;
        });

        it('should truncate large objects', () => {
            const largeObj = { data: 'x'.repeat(1500) };
            const result = truncateBody(largeObj);

            expect(result.truncated).to.be.true;
            expect(result.type).to.equal('object');
            expect(result.length).to.be.greaterThan(1000);
        });

        it('should handle circular references', () => {
            const circular: Record<string, unknown> = { a: 1 };
            circular.self = circular;

            const result = truncateBody(circular);

            expect(result.content).to.equal('[Non-serializable object]');
            expect(result.type).to.equal('object');
        });

        it('should handle null and undefined', () => {
            expect(truncateBody(null)).to.deep.equal({ content: null });
            expect(truncateBody(undefined)).to.deep.equal({ content: undefined });
        });

        it('should handle primitive types', () => {
            expect(truncateBody(123)).to.deep.equal({ content: 123 });
            expect(truncateBody(true)).to.deep.equal({ content: true });
        });
    });

    describe('axiosErrorTransformer', () => {
        it('should pass through non-Axios errors unchanged', () => {
            const error = new Error('regular error');
            const result = axiosErrorTransformer(error);

            expect(result).to.equal(error);
        });

        it('should transform AxiosError with HTTP response', () => {
            const error = new Error('Request failed with status code 500') as AxiosError;
            error.isAxiosError = true;
            error.message = 'Request failed with status code 500';
            error.response = {
                status: 500,
                statusText: 'Internal Server Error',
                data: { error: 'Something went wrong' },
                headers: new AxiosHeaders({
                    'content-type': 'application/json',
                    'set-cookie': 'session=secret',
                }),
                config: {} as any,
            };
            error.config = {
                url: 'http://example.com/api',
                method: 'get',
                timeout: 5000,
                headers: new AxiosHeaders({
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer token',
                }),
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result).to.be.instanceof(Error);
            expect(result.message).to.equal('Request failed with status code 500');
            expect(result.data.response.status).to.equal(500);
            expect(result.data.response.statusText).to.equal('Internal Server Error');
            expect(result.data.response.data).to.deep.equal({ error: 'Something went wrong' });
            expect(result.data.url).to.equal('http://example.com/api');
            expect(result.data.method).to.equal('get');
            expect(result.data.timeout).to.equal(5000);

            // Check header sanitization - sensitive headers should be excluded
            expect(result.data.headers.Authorization).to.be.undefined;
            expect(result.data.response.headers['set-cookie']).to.be.undefined;
        });

        it('should transform network error (ECONNREFUSED)', () => {
            const error = new Error('connect ECONNREFUSED 127.0.0.1:3000') as AxiosError & {
                errno: number;
                syscall: string;
            };
            error.isAxiosError = true;
            error.code = 'ECONNREFUSED';
            error.errno = -111;
            error.syscall = 'connect';
            error.config = {
                url: 'http://localhost:3000/api',
                method: 'get',
                timeout: 10000,
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result).to.be.instanceof(Error);
            expect(result.data.code).to.equal('ECONNREFUSED');
            expect(result.data.errno).to.equal(-111);
            expect(result.data.syscall).to.equal('connect');
            expect(result.data.url).to.equal('http://localhost:3000/api');
            expect(result.data.timeout).to.equal(10000);
            expect(result.data.response.status).to.be.undefined;
        });

        it('should transform timeout error (ETIMEDOUT)', () => {
            const error = new Error('timeout of 5000ms exceeded') as AxiosError;
            error.isAxiosError = true;
            error.code = 'ETIMEDOUT';
            error.config = {
                url: 'http://slow-server.com/api',
                method: 'post',
                timeout: 5000,
                data: { request: 'payload' },
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result.data.code).to.equal('ETIMEDOUT');
            expect(result.data.timeout).to.equal(5000);
            expect(result.data.payload).to.deep.equal({ request: 'payload' });
        });

        it('should provide fallback message for empty message with code', () => {
            const error = new Error() as AxiosError;
            error.isAxiosError = true;
            error.message = '';
            error.code = 'ENOTFOUND';
            error.config = {
                url: 'http://unknown-host.com/api',
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result.message).to.equal('ENOTFOUND: http://unknown-host.com/api');
        });

        it('should handle error with cause', () => {
            const cause = new Error('Underlying network error');
            const error = new Error('Request failed') as AxiosError;
            error.isAxiosError = true;
            error.cause = cause;
            error.config = {
                url: 'http://example.com/api',
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result.data.cause).to.equal('Underlying network error');
        });

        it('should truncate large response bodies', () => {
            const largeBody = 'x'.repeat(2000);
            const error = new Error('Request failed') as AxiosError;
            error.isAxiosError = true;
            error.response = {
                status: 400,
                statusText: 'Bad Request',
                data: largeBody,
                headers: {},
                config: {} as any,
            };
            error.config = {
                url: 'http://example.com/api',
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result.data.response.data).to.have.length(1000);
            expect(result.data.response.dataTruncated).to.be.true;
            expect(result.data.response.dataLength).to.equal(2000);
        });

        it('should include baseURL when present', () => {
            const error = new Error('Request failed') as AxiosError;
            error.isAxiosError = true;
            error.config = {
                baseURL: 'http://api.example.com',
                url: '/users/123',
                method: 'get',
            } as any;

            const result = axiosErrorTransformer(error) as Error & { data: any };

            expect(result.data.baseURL).to.equal('http://api.example.com');
            expect(result.data.url).to.equal('/users/123');
        });
    });
});
