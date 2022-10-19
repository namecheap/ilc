import { expect } from 'chai';
import { RuntimeError } from './RuntimeError';

describe('RuntimeError', () => {
    it('should have correct code', () => {
        const error = new RuntimeError();
        expect(error.code).to.be.equal('runtime');
    });

    it('should have errorId', () => {
        const error = new RuntimeError();
        expect(error.errorId).to.be.a('string');
    });
});
