const System = window.System;

let perfStart;
let afterRoutingEvent = false;
const appsWaitingForSlot = {};
const readySlots = [];

export function init() {
    perfStart = performance.now();
    for (let id of window.ilcApps) {
        markSlotAsReady(id);
    }
    window.ilcApps = {push: id => markSlotAsReady(id)};

    window.addEventListener('single-spa:routing-event', () => (afterRoutingEvent = true));
}

export async function waitForSlot(slotName) {
    const res = {
        spaBundle: null,
        cssBundle: null,
    };

    if (afterRoutingEvent) {
        return res;
    }

    await new Promise(resolve => {
        if (readySlots.includes(slotName)) {
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

function markSlotAsReady(id) {
    setTimeout(() => {
        readySlots.push(id);
        appsWaitingForSlot[id] && appsWaitingForSlot[id]();
    }, 0);
}
