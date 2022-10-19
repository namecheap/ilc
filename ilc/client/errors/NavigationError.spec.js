import { expect } from 'chai';
import { NavigationError } from './NavigationError';

describe('NavigationError', () => {
    it('should have correct code', () => {
        const error = new NavigationError();
        expect(error.code).to.be.equal('runtime.criticalRuntime.navigation');
    });

    it('should have errorId', () => {
        const error = new NavigationError();
        expect(error.errorId).to.be.a('string');
    });
});
