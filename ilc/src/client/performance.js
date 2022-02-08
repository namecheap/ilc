
export default function init(getCurrentPath) {
    let startRouting;
    let targetHref;

    window.addEventListener('single-spa:before-routing-event', () => {
        // Check is needed as this event may be triggered 2 times
        // due to "app re-mount due to changed props" functionality
        if (targetHref === window.location.href) {
            return;
        }

        startRouting = performance.now();
        targetHref = window.location.href;
    });

    window.addEventListener('ilc:all-slots-loaded', () => {
        const currentPath = getCurrentPath();
        const endRouting = performance.now();
        const timeMs = parseInt(endRouting - startRouting);

        const route = currentPath.specialRole ? `special_${currentPath.specialRole}` : currentPath.route;

        console.info(`ILC: Client side route change to "${route}" took ${timeMs} milliseconds.`);

        if (window.newrelic && window.newrelic.addPageAction) {
            window.newrelic.addPageAction('routeChange', { time: timeMs, route })
        }
    });
}
