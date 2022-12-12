import { expect } from 'chai';
import NamedTransitionBlocker from './NamedTransitionBlocker';

describe('NamedTransitionBlocker', () => {
    let transitionBlocker;

    beforeEach(() => {
        transitionBlocker = new NamedTransitionBlocker('Blocker', (resolve) => resolve());
    });

    it('Should return transition blocker name on getId method', () => {
        expect(transitionBlocker.getId()).to.equal('Blocker');
    });
});
