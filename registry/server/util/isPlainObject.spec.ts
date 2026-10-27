import { expect } from 'chai';
import { isPlainObject } from './isPlainObject';

describe('isPlainObject', () => {
    it('should accept object literals and parsed JSON objects', () => {
        expect(isPlainObject({})).to.be.true;
        expect(isPlainObject({ a: 1 })).to.be.true;
        expect(isPlainObject(JSON.parse('{"a":{"b":1}}'))).to.be.true;
    });

    it('should accept objects without a prototype', () => {
        expect(isPlainObject(Object.create(null))).to.be.true;
    });

    it('should reject arrays and class instances', () => {
        class Example {}

        expect(isPlainObject([])).to.be.false;
        expect(isPlainObject(new Example())).to.be.false;
        expect(isPlainObject(new Date())).to.be.false;
        expect(isPlainObject(new Map())).to.be.false;
        expect(isPlainObject(Object.create({}))).to.be.false;
    });

    it('should reject null, undefined, primitives and functions', () => {
        expect(isPlainObject(null)).to.be.false;
        expect(isPlainObject(undefined)).to.be.false;
        expect(isPlainObject('text')).to.be.false;
        expect(isPlainObject(1)).to.be.false;
        expect(isPlainObject(true)).to.be.false;
        expect(isPlainObject(() => ({}))).to.be.false;
    });
});
