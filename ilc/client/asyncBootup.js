const System = window.System;

let perfStart;
let afterRoutingEvent = false;
let appsWaitingForSlot = {};

export function init() {
    perfStart = performance.now();
    for (let id of window.ilcApps) {
        appsWaitingForSlot[id] && appsWaitingForSlot[id]();
    }
    window.ilcApps = {push: (id) => (appsWaitingForSlot[id] && appsWaitingForSlot[id]())};

    window.addEventListener('single-spa:routing-event', () => (afterRoutingEvent = true));
}

export async function waitForSlot(slotName) {
    const res = {
        spaBundle: null,
        cssBundle: null,
    };

    await new Promise(resolve => {
        if (document.getElementById(slotName) !== null) {
            return resolve();
        }

        appsWaitingForSlot[slotName] = resolve;
    });
    !afterRoutingEvent && console.info(`ILC: Registering app @${slotName} after ` + (performance.now() - perfStart) + ` milliseconds.`);

    const slotEl = document.getElementById(slotName);
    const overridesEl = slotEl.querySelector('script[type="spa-config-override"]');
    if (overridesEl) {
        const conf = JSON.parse(overridesEl.innerHTML);

        res.spaBundle = conf.spaBundle;
        res.cssBundle = conf.cssBundle;

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
