import { expect } from 'chai';
import { CorsError } from './CorsError';

describe('CorsError', () => {
    it('should have correct code', () => {
        const error = new CorsError();
        expect(error.code).to.be.equal('runtime.cors');
    });

    it('should have errorId', () => {
        const error = new CorsError();
        expect(error.errorId).to.be.a('string');
    });
});
