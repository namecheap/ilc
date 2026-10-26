import { expect } from 'chai';
import { normalizeArray } from './normalizeArray';

describe('normalizeArray', () => {
    it('should wrap a single value in an array', () => {
        expect(normalizeArray('primary')).to.deep.equal(['primary']);
        expect(normalizeArray(5)).to.deep.equal([5]);
    });

    it('should return the same array', () => {
        const value = ['primary', 'regular'];

        expect(normalizeArray(value)).to.equal(value);
    });

    it('should keep an empty array empty', () => {
        expect(normalizeArray([])).to.deep.equal([]);
    });

    it('should wrap null', () => {
        expect(normalizeArray(null)).to.deep.equal([null]);
    });

    it('should return undefined for undefined', () => {
        expect(normalizeArray(undefined)).to.be.undefined;
    });
});
