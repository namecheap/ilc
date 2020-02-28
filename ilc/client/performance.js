
export default function init(getCurrentPath) {
    let startRouting;
    let nrTrace = null;

    window.addEventListener('single-spa:before-routing-event', () => {
        startRouting = performance.now();

        if (newrelic && newrelic.interaction) {
            nrTrace = newrelic.interaction().createTracer('routeChange');
        }
    });

    window.addEventListener('ilc:all-slots-loaded', () => {
        const currentPath = getCurrentPath();
        const endRouting = performance.now();
        const timeMs = parseInt(endRouting - startRouting);

        console.info(`ILC: Client side route change to "${currentPath.route}" took ${timeMs} milliseconds.`);

        if (newrelic && newrelic.addPageAction) {
            newrelic.addPageAction('routeChange', { time: timeMs, route: currentPath.route })
        }

        if (nrTrace) {
            nrTrace();
        }
    });
}
