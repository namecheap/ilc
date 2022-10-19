import { expect } from 'chai';
import { CriticalFragmentError } from './CriticalFragmentError';

describe('CriticalFragmentError', () => {
    it('should have correct code', () => {
        const error = new CriticalFragmentError();
        expect(error.code).to.be.equal('runtime.criticalRuntime.criticalFragment');
    });

    it('should have errorId', () => {
        const error = new CriticalFragmentError();
        expect(error.errorId).to.be.a('string');
    });
});
