import { expect } from 'chai';
import { CriticalInternalError } from './CriticalInternalError';

describe('CriticalInternalError', () => {
    it('should have correct code', () => {
        const error = new CriticalInternalError();
        expect(error.code).to.be.equal('internal.criticalInternal');
    });

    it('should have errorId', () => {
        const error = new CriticalInternalError();
        expect(error.errorId).to.be.a('string');
    });
});
