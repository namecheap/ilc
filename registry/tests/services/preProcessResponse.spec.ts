import { expect } from 'chai';
import preProcessResponse from '../../server/common/services/preProcessResponse';

describe('preProcessResponse', () => {
    describe('when value is neither an object nor an array', () => {
        it('should return null as is', () => {
            expect(preProcessResponse(null)).to.be.null;
        });

        it('should return undefined as is', () => {
            expect(preProcessResponse(undefined)).to.be.undefined;
        });

        it('should return numbers as is', () => {
            expect(preProcessResponse(0)).to.equal(0);
            expect(preProcessResponse(42)).to.equal(42);
        });

        it('should return booleans as is', () => {
            expect(preProcessResponse(false)).to.be.false;
            expect(preProcessResponse(true)).to.be.true;
        });

        it('should return non-JSON strings as is', () => {
            expect(preProcessResponse('plain text')).to.equal('plain text');
            expect(preProcessResponse('')).to.equal('');
        });

        it('should not convert numeric strings to numbers', () => {
            expect(preProcessResponse('123')).to.equal('123');
        });
    });

    describe('when value is an object', () => {
        it('should omit null and empty values', () => {
            expect(
                preProcessResponse({
                    name: 'app',
                    nullable: null,
                    emptyString: '',
                    emptyArray: [],
                    emptyObject: {},
                }),
            ).to.deep.equal({ name: 'app' });
        });

        it('should keep numbers and booleans even when they are falsy', () => {
            expect(preProcessResponse({ zero: 0, disabled: false, enabled: true })).to.deep.equal({
                zero: 0,
                disabled: false,
                enabled: true,
            });
        });

        it('should parse JSON string fields', () => {
            expect(
                preProcessResponse({
                    props: '{"title":"Hello"}',
                    dependencies: '["react"]',
                    numeric: '42',
                }),
            ).to.deep.equal({
                props: { title: 'Hello' },
                dependencies: ['react'],
                numeric: '42',
            });
        });

        it('should omit JSON string fields that parse to empty values', () => {
            expect(
                preProcessResponse({ name: 'app', props: '{}', dependencies: '[]', nullable: 'null' }),
            ).to.deep.equal({ name: 'app' });
        });

        it('should parse a JSON object string and omit its empty values', () => {
            expect(preProcessResponse('{"name":"app","nullable":null,"props":{}}')).to.deep.equal({ name: 'app' });
        });
    });

    describe('when value is an array', () => {
        it('should process every item', () => {
            expect(
                preProcessResponse([
                    { name: 'first', props: '{"a":1}', nullable: null },
                    { name: 'second', emptyString: '', enabled: false },
                ]),
            ).to.deep.equal([
                { name: 'first', props: { a: 1 } },
                { name: 'second', enabled: false },
            ]);
        });

        it('should return an empty array as is', () => {
            expect(preProcessResponse([])).to.deep.equal([]);
        });
    });
});
