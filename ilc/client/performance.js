
export default function init(getCurrentPath) {
    let initPageLoading = true;
    let startRouting;
    let nrTrace = null;

    window.addEventListener('single-spa:before-routing-event', (e) => {
        if (initPageLoading) {
            initPageLoading = false;

            return;
        }
        startRouting = performance.now();

        if (window.newrelic && window.newrelic.interaction) {
            nrTrace = window.newrelic.interaction().createTracer('routeChange');
        }
    });

    window.addEventListener('ilc:all-slots-loaded', () => {
        const currentPath = getCurrentPath();
        const endRouting = performance.now();
        const timeMs = parseInt(endRouting - startRouting);

        console.info(`ILC: Client side route change to "${currentPath.route}" took ${timeMs} milliseconds.`);

        if (window.newrelic && window.newrelic.addPageAction) {
            window.newrelic.addPageAction('routeChange', { time: timeMs, route: currentPath.route })
        }

        if (nrTrace) {
            nrTrace();
        }
    });
}
