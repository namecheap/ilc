import singleSpaEvents from './constants/singleSpaEvents';

const System = window.System;

export default class AsyncBootUp {
    #logger;
    #performance;
    #performanceStart;
    #afterRoutingEvent = false;
    #appsWaitingForSlot = {};
    #readySlots = [];
    #pageLoadingIsDone = false;

    constructor(logger = window.console, performance = window.performance) {
        this.#logger = logger;
        this.#performance = performance;
        this.#performanceStart = this.#performance.now();

        for (let id of window.ilcApps) {
            this.#markSlotAsReady(id);
        }

        window.ilcApps = { push: (id) => this.#markSlotAsReady(id) };
        window.addEventListener(singleSpaEvents.ROUTING_EVENT, () => (this.#afterRoutingEvent = true));
    }

    async waitForSlot(slotName) {
        const res = {
            spaBundle: null,
            cssBundle: null,
            wrapperPropsOverride: null,
        };

        if (this.#afterRoutingEvent) {
            return res;
        }

        await new Promise((resolve) => {
            if (this.#readySlots.includes(slotName)) {
                return resolve();
            } else if (!this.#pageLoadingIsDone) {
                this.#appsWaitingForSlot[slotName] = resolve;
            } else {
                return resolve(); // We don't have such slot on the page
            }
        });

        if (!this.#afterRoutingEvent) {
            const milliseconds = this.#performance.now() - this.#performanceStart;
            this.#logger.info(`ILC: Registering app @${slotName} after ${milliseconds} milliseconds.`);
        }

        const slotEl = document.getElementById(slotName);
        if (slotEl === null) {
            this.#logger.warn(
                `Looks like we're missing slot "${slotName}" in template... Ignoring possible config overrides...`,
            );
            return res;
        }

        const overridesEl = slotEl.querySelector('script[type="spa-config-override"]');
        if (overridesEl) {
            const conf = JSON.parse(overridesEl.innerHTML);

            if (conf.spaBundle) {
                System.overrideImportMap(conf.appName, conf.spaBundle);
                res.spaBundle = conf.spaBundle;
            }
            if (conf.cssBundle) {
                res.cssBundle = conf.cssBundle;
            }
            if (conf.wrapperPropsOverride) {
                res.wrapperPropsOverride = conf.wrapperPropsOverride;
            }

            if (conf.dependencies) {
                for (let id in conf.dependencies) {
                    if (conf.dependencies.hasOwnProperty(id)) {
                        System.overrideImportMap(id, conf.dependencies[id]);
                    }
                }
            }

            overridesEl.parentNode.removeChild(overridesEl);
        }

        return res;
    }

    #markSlotAsReady = (id) => {
        setTimeout(() => {
            // All slots has been loaded
            if (id === Infinity) {
                // Infinity here used as indicator of the end of the slots list
                this.#pageLoadingIsDone = true;
                for (let slotName in this.#appsWaitingForSlot) {
                    this.#appsWaitingForSlot[slotName]();
                }
            } else {
                this.#readySlots.push(id);
                if (this.#appsWaitingForSlot[id]) {
                    this.#appsWaitingForSlot[id]();
                    delete this.#appsWaitingForSlot[id];
                }
            }
        }, 0);
    };
}
