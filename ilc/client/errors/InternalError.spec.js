import { expect } from 'chai';
import { InternalError } from './InternalError';

describe('InternalError', () => {
    it('should have correct code', () => {
        const error = new InternalError();
        expect(error.code).to.be.equal('internal');
    });

    it('should have errorId', () => {
        const error = new InternalError();
        expect(error.errorId).to.be.a('string');
    });
});
