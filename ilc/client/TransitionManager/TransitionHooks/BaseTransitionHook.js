export class BaseTransitionHook {
    beforeHandler() {
        throw new Error('BaseTransitionHook beforeHandler is not implemented');
    }

    afterHandler() {
        throw new Error('BaseTransitionHook afterHandler is not implemented');
    }
}
