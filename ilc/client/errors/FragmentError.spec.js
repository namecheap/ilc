import { expect } from 'chai';
import { FragmentError } from './FragmentError';

describe('FragmentError', () => {
    it('should have correct code', () => {
        const error = new FragmentError();
        expect(error.code).to.be.equal('runtime.fragment');
    });

    it('should have errorId', () => {
        const error = new FragmentError();
        expect(error.errorId).to.be.a('string');
    });
});
