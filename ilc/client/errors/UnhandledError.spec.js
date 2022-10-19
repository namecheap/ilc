import { expect } from 'chai';
import { UnhandledError } from './UnhandledError';

describe('UnhandledError', () => {
    it('should have correct code', () => {
        const error = new UnhandledError();
        expect(error.code).to.be.equal('runtime.unhandled');
    });

    it('should have errorId', () => {
        const error = new UnhandledError();
        expect(error.errorId).to.be.a('string');
    });
});
