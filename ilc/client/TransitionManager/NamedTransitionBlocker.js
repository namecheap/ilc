import TransitionBlocker from './TransitionBlocker';

export default class NamedTransitionBlocker extends TransitionBlocker {
    #externalId;

    constructor(externalId, blockerExecutor) {
        super(blockerExecutor);
        this.#externalId = externalId;
    }

    getId() {
        return this.#externalId;
    }
}
