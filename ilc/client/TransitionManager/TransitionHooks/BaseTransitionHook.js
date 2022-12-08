export class BaseTransitionHook {
    async beforeHandler() {
        throw new Error('BaseTransitionHook beforeHandler is not implemented');
    }

    async afterHandler() {
        throw new Error('BaseTransitionHook afterHandler is not implemented');
    }
}
