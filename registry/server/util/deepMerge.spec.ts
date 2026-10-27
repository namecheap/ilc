import { deepMerge } from './deepMerge';
import { expect } from 'chai';

describe('deepMerge utility', () => {
    it('should merge nested objects with later sources taking priority', () => {
        const result = deepMerge(
            {},
            { apiUrl: 'shared', features: { chat: true, search: true } },
            { apiUrl: 'domain', features: { search: false } },
        );
        expect(result).to.deep.equal({ apiUrl: 'domain', features: { chat: true, search: false } });
    });

    it('should merge arrays index by index', () => {
        expect(deepMerge({}, { list: [1, 2, 3] }, { list: ['x'] })).to.deep.equal({ list: ['x', 2, 3] });
    });

    it('should replace values of a different type', () => {
        expect(deepMerge({}, { a: { b: 1 }, c: { d: 1 } }, { a: 'text', c: [1] })).to.deep.equal({
            a: 'text',
            c: [1],
        });
        expect(deepMerge({}, { a: 1 }, { a: null })).to.deep.equal({ a: null });
    });

    it('should skip undefined source values and non-object sources', () => {
        expect(deepMerge({}, { a: 1 }, { a: undefined }, null, undefined)).to.deep.equal({ a: 1 });
    });

    it('should not share nested objects with the sources', () => {
        const source = { nested: { a: 1 }, list: [{ b: 1 }] };
        const result = deepMerge({}, source, { nested: { c: 2 }, list: [{ d: 2 }] });

        expect(result).to.deep.equal({ nested: { a: 1, c: 2 }, list: [{ b: 1, d: 2 }] });
        expect(source).to.deep.equal({ nested: { a: 1 }, list: [{ b: 1 }] });
    });

    it('should ignore __proto__ keys', () => {
        const result = deepMerge({}, JSON.parse('{"__proto__": {"polluted": true}, "a": 1}'));

        expect(result).to.deep.equal({ a: 1 });
        expect(Object.getPrototypeOf(result)).to.equal(Object.prototype);
        expect(({} as Record<string, unknown>).polluted).to.be.undefined;
    });
});
