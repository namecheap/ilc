import { expect } from 'chai';
import { defined } from './defined';

describe('defined', () => {
    it('should return a defined value', () => {
        const value = { a: 1 };
        expect(defined(value)).to.equal(value);
        expect(defined('text')).to.equal('text');
    });

    it('should return falsy values that are not null or undefined', () => {
        expect(defined(0)).to.equal(0);
        expect(defined('')).to.equal('');
        expect(defined(false)).to.equal(false);
        expect(defined(NaN)).to.be.NaN;
    });

    it('should throw for null', () => {
        expect(() => defined(null)).to.throw('Expected value to be defined, but received null');
    });

    it('should throw for undefined', () => {
        expect(() => defined(undefined)).to.throw('Expected value to be defined, but received undefined');
    });
});
