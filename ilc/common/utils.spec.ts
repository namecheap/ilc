import { expect } from 'chai';
import sinon from 'sinon';
import {
    appIdToNameAndSlot,
    makeAppId,
    cloneDeep,
    uniqueArray,
    encodeHtmlEntities,
    decodeHtmlEntities,
    removeQueryParams,
    addTrailingSlash,
    addTrailingSlashToPath,
    TimeoutError,
    withTimeout,
    extendError,
} from './utils';

describe('utils', () => {
    describe('appIdToNameAndSlot', () => {
        it('should parse appId with slot into appName and slotName', () => {
            const result = appIdToNameAndSlot('myapp__at__header');

            expect(result).to.deep.equal({
                appName: '@portal/myapp',
                slotName: 'header',
            });
        });

        it('should handle appId without slot (shared library)', () => {
            const result = appIdToNameAndSlot('sharedLib');

            expect(result).to.deep.equal({
                appName: 'sharedLib',
                slotName: 'none',
            });
        });

        it('should handle appId with multiple underscores in app name', () => {
            const result = appIdToNameAndSlot('my_complex_app__at__footer');

            expect(result).to.deep.equal({
                appName: '@portal/my_complex_app',
                slotName: 'footer',
            });
        });

        it('should handle appId with dashes', () => {
            const result = appIdToNameAndSlot('my-app__at__sidebar');

            expect(result).to.deep.equal({
                appName: '@portal/my-app',
                slotName: 'sidebar',
            });
        });

        it('should handle edge case with only separator', () => {
            const result = appIdToNameAndSlot('__at__');

            expect(result).to.deep.equal({
                appName: '@portal/',
                slotName: '',
            });
        });
    });

    describe('makeAppId', () => {
        it('should create appId from appName with @portal prefix and slotName', () => {
            const result = makeAppId('@portal/myapp', 'header');

            expect(result).to.equal('myapp__at__header');
        });

        it('should create appId from appName without @portal prefix', () => {
            const result = makeAppId('myapp', 'header');

            expect(result).to.equal('myapp__at__header');
        });

        it('should handle app names with underscores', () => {
            const result = makeAppId('@portal/my_complex_app', 'footer');

            expect(result).to.equal('my_complex_app__at__footer');
        });

        it('should handle app names with dashes', () => {
            const result = makeAppId('@portal/my-app', 'sidebar');

            expect(result).to.equal('my-app__at__sidebar');
        });

        it('should handle slot names with special characters', () => {
            const result = makeAppId('@portal/myapp', 'main-content');

            expect(result).to.equal('myapp__at__main-content');
        });

        it('should be reversible with appIdToNameAndSlot', () => {
            const appName = '@portal/testapp';
            const slotName = 'content';
            const appId = makeAppId(appName, slotName);
            const parsed = appIdToNameAndSlot(appId);

            expect(parsed.appName).to.equal(appName);
            expect(parsed.slotName).to.equal(slotName);
        });
    });

    describe('cloneDeep', () => {
        it('should deep clone a simple object', () => {
            const source = { a: 1, b: 2 };
            const clone = cloneDeep(source);

            expect(clone).to.deep.equal(source);
            expect(clone).to.not.equal(source);
        });

        it('should deep clone nested objects', () => {
            const source = { a: { b: { c: 1 } } };
            const clone = cloneDeep(source);

            expect(clone).to.deep.equal(source);
            expect(clone).to.not.equal(source);
            expect(clone.a).to.not.equal(source.a);
            expect(clone.a.b).to.not.equal(source.a.b);
        });

        it('should clone arrays within objects', () => {
            const source = { items: [1, 2, 3], nested: { arr: [4, 5] } };
            const clone = cloneDeep(source);

            expect(clone).to.deep.equal(source);
            expect(clone.items).to.not.equal(source.items);
            expect(clone.nested.arr).to.not.equal(source.nested.arr);
        });

        it('should handle objects with various data types', () => {
            const source = {
                str: 'test',
                num: 42,
                bool: true,
                nullVal: null,
                arr: [1, 2],
            };
            const clone = cloneDeep(source);

            expect(clone).to.deep.equal(source);
        });

        it('should not affect the original when modifying the clone', () => {
            const source = { a: { b: 1 } };
            const clone = cloneDeep(source);
            clone.a.b = 2;

            expect(source.a.b).to.equal(1);
            expect(clone.a.b).to.equal(2);
        });
    });

    describe('uniqueArray', () => {
        it('should remove duplicate primitives from array', () => {
            const result = uniqueArray([1, 2, 2, 3, 1, 4]);

            expect(result).to.deep.equal([1, 2, 3, 4]);
        });

        it('should handle array with no duplicates', () => {
            const result = uniqueArray([1, 2, 3, 4]);

            expect(result).to.deep.equal([1, 2, 3, 4]);
        });

        it('should handle empty array', () => {
            const result = uniqueArray([]);

            expect(result).to.deep.equal([]);
        });

        it('should handle array with strings', () => {
            const result = uniqueArray(['a', 'b', 'a', 'c', 'b']);

            expect(result).to.deep.equal(['a', 'b', 'c']);
        });

        it('should handle array with mixed types', () => {
            const result = uniqueArray([1, '1', 2, '2', 1, 2]);

            expect(result).to.deep.equal([1, '1', 2, '2']);
        });

        it('should handle array with all same values', () => {
            const result = uniqueArray([5, 5, 5, 5]);

            expect(result).to.deep.equal([5]);
        });
    });

    describe('encodeHtmlEntities', () => {
        it('should encode less than symbol', () => {
            const result = encodeHtmlEntities('<div>');

            expect(result).to.equal('&lt;div&gt;');
        });

        it('should encode greater than symbol', () => {
            const result = encodeHtmlEntities('x > y');

            expect(result).to.equal('x &gt; y');
        });

        it('should encode double quotes', () => {
            const result = encodeHtmlEntities('say "hello"');

            expect(result).to.equal('say &quot;hello&quot;');
        });

        it('should encode all three entities', () => {
            const result = encodeHtmlEntities('<script src="evil.js">');

            expect(result).to.equal('&lt;script src=&quot;evil.js&quot;&gt;');
        });

        it('should handle string without special characters', () => {
            const result = encodeHtmlEntities('hello world');

            expect(result).to.equal('hello world');
        });

        it('should handle empty string', () => {
            const result = encodeHtmlEntities('');

            expect(result).to.equal('');
        });

        it('should handle multiple occurrences', () => {
            const result = encodeHtmlEntities('<<>>""');

            expect(result).to.equal('&lt;&lt;&gt;&gt;&quot;&quot;');
        });
    });

    describe('decodeHtmlEntities', () => {
        it('should decode less than entity', () => {
            const result = decodeHtmlEntities('&lt;div&gt;');

            expect(result).to.equal('<div>');
        });

        it('should decode greater than entity', () => {
            const result = decodeHtmlEntities('x &gt; y');

            expect(result).to.equal('x > y');
        });

        it('should decode quote entity', () => {
            const result = decodeHtmlEntities('say &quot;hello&quot;');

            expect(result).to.equal('say "hello"');
        });

        it('should decode all three entities', () => {
            const result = decodeHtmlEntities('&lt;script src=&quot;evil.js&quot;&gt;');

            expect(result).to.equal('<script src="evil.js">');
        });

        it('should handle string without entities', () => {
            const result = decodeHtmlEntities('hello world');

            expect(result).to.equal('hello world');
        });

        it('should handle empty string', () => {
            const result = decodeHtmlEntities('');

            expect(result).to.equal('');
        });

        it('should be reversible with encodeHtmlEntities', () => {
            const original = '<div class="test">Hello "World"</div>';
            const encoded = encodeHtmlEntities(original);
            const decoded = decodeHtmlEntities(encoded);

            expect(decoded).to.equal(original);
        });
    });

    describe('removeQueryParams', () => {
        it('should remove query parameters from URL', () => {
            const result = removeQueryParams('https://example.com/path?foo=bar&baz=qux');

            expect(result).to.equal('https://example.com/path');
        });

        it('should handle URL without query parameters', () => {
            const result = removeQueryParams('https://example.com/path');

            expect(result).to.equal('https://example.com/path');
        });

        it('should handle URL with only question mark', () => {
            const result = removeQueryParams('https://example.com/path?');

            expect(result).to.equal('https://example.com/path');
        });

        it('should handle relative paths with query params', () => {
            const result = removeQueryParams('/path/to/resource?id=123');

            expect(result).to.equal('/path/to/resource');
        });

        it('should handle empty string', () => {
            const result = removeQueryParams('');

            expect(result).to.equal('');
        });

        it('should handle URL with fragment after query params', () => {
            const result = removeQueryParams('https://example.com/path?foo=bar#section');

            expect(result).to.equal('https://example.com/path');
        });

        it('should handle URL with multiple question marks', () => {
            const result = removeQueryParams('https://example.com/path?foo=bar?baz=qux');

            expect(result).to.equal('https://example.com/path');
        });
    });

    describe('addTrailingSlash', () => {
        it('should add trailing slash to URL without one', () => {
            const result = addTrailingSlash('https://example.com/path');

            expect(result).to.equal('https://example.com/path/');
        });

        it('should not add trailing slash if already present', () => {
            const result = addTrailingSlash('https://example.com/path/');

            expect(result).to.equal('https://example.com/path/');
        });

        it('should handle root path', () => {
            const result = addTrailingSlash('https://example.com');

            expect(result).to.equal('https://example.com/');
        });

        it('should handle empty string', () => {
            const result = addTrailingSlash('');

            expect(result).to.equal('/');
        });

        it('should handle relative paths', () => {
            const result = addTrailingSlash('/path/to/resource');

            expect(result).to.equal('/path/to/resource/');
        });

        it('should handle single slash', () => {
            const result = addTrailingSlash('/');

            expect(result).to.equal('/');
        });
    });

    describe('addTrailingSlashToPath', () => {
        it('should add trailing slash to full URL pathname', () => {
            const result = addTrailingSlashToPath('https://example.com/path');

            expect(result).to.equal('https://example.com/path/');
        });

        it('should not add trailing slash if pathname already has one', () => {
            const result = addTrailingSlashToPath('https://example.com/path/');

            expect(result).to.equal('https://example.com/path/');
        });

        it('should handle full URL with query params', () => {
            const result = addTrailingSlashToPath('https://example.com/path?foo=bar');

            expect(result).to.equal('https://example.com/path/?foo=bar');
        });

        it('should handle full URL with hash', () => {
            const result = addTrailingSlashToPath('https://example.com/path#section');

            expect(result).to.equal('https://example.com/path/#section');
        });

        it('should handle relative path without leading slash', () => {
            const result = addTrailingSlashToPath('path/to/resource');

            expect(result).to.equal('path/to/resource/');
        });

        it('should handle relative path with leading slash', () => {
            const result = addTrailingSlashToPath('/path/to/resource');

            expect(result).to.equal('/path/to/resource/');
        });

        it('should handle root path', () => {
            const result = addTrailingSlashToPath('https://example.com');

            expect(result).to.equal('https://example.com/');
        });

        it('should only return pathname for relative paths (strips query and hash)', () => {
            const result = addTrailingSlashToPath('path?foo=bar#section');

            // Function only returns the pathname part, query and hash are stripped
            expect(result).to.equal('path/');
        });

        it('should only return pathname when path has trailing slash with query params', () => {
            const result = addTrailingSlashToPath('/path/?foo=bar');

            // Function only returns the pathname part, query params are stripped
            expect(result).to.equal('/path/');
        });
    });

    describe('TimeoutError', () => {
        it('should be an instance of Error', () => {
            const error = new TimeoutError('timeout');

            expect(error).to.be.instanceof(Error);
        });

        it('should have correct error message', () => {
            const error = new TimeoutError('Operation timed out');

            expect(error.message).to.equal('Operation timed out');
        });

        it('should have correct name', () => {
            const error = new TimeoutError('timeout');

            expect(error.name).to.equal('Error');
        });
    });

    describe('withTimeout', () => {
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should resolve if promise completes before timeout', async () => {
            const promise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 100);
            });

            const resultPromise = withTimeout(promise, 200);
            await clock.tickAsync(100);
            const result = await resultPromise;

            expect(result).to.equal('success');
        });

        it('should reject with TimeoutError if promise takes too long', async () => {
            const promise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 300);
            });

            const resultPromise = withTimeout(promise, 100);
            await clock.tickAsync(100);

            try {
                await resultPromise;
                expect.fail('Should have thrown TimeoutError');
            } catch (error) {
                expect(error).to.be.instanceof(TimeoutError);
            }
        });

        it('should use custom timeout message', async () => {
            const promise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 300);
            });

            const resultPromise = withTimeout(promise, 100, 'Custom timeout message');
            await clock.tickAsync(100);

            try {
                await resultPromise;
                expect.fail('Should have thrown TimeoutError');
            } catch (error) {
                expect(error).to.be.instanceof(TimeoutError);
                expect((error as Error).message).to.equal('Custom timeout message');
            }
        });

        it('should clear timeout when promise resolves', async () => {
            const promise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 100);
            });

            const resultPromise = withTimeout(promise, 200);
            await clock.tickAsync(100);
            await resultPromise;

            // Advance time past the timeout to ensure clearTimeout worked
            await clock.tickAsync(200);
            // No additional assertions needed; if clearTimeout didn't work,
            // the timeout would still fire and potentially cause issues
        });

        it('should handle promise rejection before timeout', async () => {
            const error = new Error('Promise failed');
            const promise = new Promise<string>((resolve, reject) => {
                setTimeout(() => reject(error), 50);
            });

            const resultPromise = withTimeout(promise, 200);
            await clock.tickAsync(50);

            try {
                await resultPromise;
                expect.fail('Should have thrown original error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });

        it('should handle immediately resolved promise', async () => {
            const promise = Promise.resolve('immediate');
            const result = await withTimeout(promise, 100);

            expect(result).to.equal('immediate');
        });

        it('should handle immediately rejected promise', async () => {
            const error = new Error('immediate failure');
            const promise = Promise.reject(error);

            try {
                await withTimeout(promise, 100);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });
    });

    describe('extendError', () => {
        it('should create custom error class', () => {
            const CustomError = extendError('CustomError');
            const error = new CustomError({ message: 'test message' });

            expect(error).to.be.instanceof(Error);
            expect(error.message).to.equal('test message');
        });

        it('should create custom error class with options', () => {
            const CustomError = extendError<{ code: number }>('CustomError', {
                defaultData: { code: 500 },
            });
            const error = new CustomError({ message: 'test message' });

            expect(error).to.be.instanceof(Error);
            expect(error.message).to.equal('test message');
            expect(error.data.code).to.equal(500);
        });

        it('should create different error classes with different names', () => {
            const ErrorA = extendError('ErrorA');
            const ErrorB = extendError('ErrorB');

            const errorA = new ErrorA({ message: 'A' });
            const errorB = new ErrorB({ message: 'B' });

            expect(errorA.message).to.equal('A');
            expect(errorB.message).to.equal('B');
        });

        it('should allow overriding default data', () => {
            const CustomError = extendError<{ code: number }>('CustomError', {
                defaultData: { code: 500 },
            });
            const error = new CustomError({ message: 'test message', data: { code: 404 } });

            expect(error.data.code).to.equal(404);
        });

        it('should handle error with cause', () => {
            const cause = new Error('Original error');
            const CustomError = extendError('CustomError');
            const error = new CustomError({ message: 'Wrapper error', cause });

            expect(error.message).to.equal('Wrapper error');
            expect(error.cause).to.equal(cause);
        });

        it('should use default message when not provided', () => {
            const CustomError = extendError('CustomError', {
                defaultMessage: 'Default error message',
            });
            const error = new CustomError({});

            expect(error.message).to.equal('Default error message');
        });

        it('should allow creating error without config', () => {
            const CustomError = extendError('CustomError', {
                defaultMessage: 'Default message',
                defaultData: {},
            });
            const error = new CustomError();

            expect(error).to.be.instanceof(Error);
            expect(error.message).to.equal('Default message');
        });
    });
});
