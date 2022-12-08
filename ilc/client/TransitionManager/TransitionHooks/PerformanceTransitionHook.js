import {BaseTransitionHook} from './BaseTransitionHook';

export class PerformanceTransitionHook extends BaseTransitionHook {
    #currentPathGetter;
    #startRouting;

    constructor(currentPathGetter) {
        super();
        this.#currentPathGetter = currentPathGetter;
    }

    async beforeHandler() {
        this.#startRouting = performance.now();
    }

    async afterHandler() {
        const currentPath = this.#currentPathGetter();
        const endRouting = performance.now();
        const timeMs = parseInt(endRouting - this.#startRouting);

        const route = currentPath.specialRole ? `special_${currentPath.specialRole}` : currentPath.route;

        // ToDo: Show only in dev mode in prod reporting to newRelic
        console.info(`ILC: Client side route change to "${route}" took ${timeMs} milliseconds.`);


        // ToDo: remove newrelic and use more abstract interface for monitoring tools
        if (window.newrelic && window.newrelic.addPageAction) {
            window.newrelic.addPageAction('routeChange', { time: timeMs, route })
        }
    }
}
