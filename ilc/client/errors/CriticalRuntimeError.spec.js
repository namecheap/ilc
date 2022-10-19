import { expect } from 'chai';
import { CriticalRuntimeError } from './CriticalRuntimeError';

describe('CriticalRuntimeError', () => {
    it('should have correct code', () => {
        const error = new CriticalRuntimeError();
        expect(error.code).to.be.equal('runtime.criticalRuntime');
    });

    it('should have errorId', () => {
        const error = new CriticalRuntimeError();
        expect(error.errorId).to.be.a('string');
    });
});
