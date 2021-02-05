let registryConf = null;

export default function () {
    if (registryConf !== null) {
        return registryConf;
    }

    const confScript = document.querySelector('script[type="ilc-config"]');
    if (confScript === null) {
        throw new Error('Can\'t find single-spa config');
    }

    registryConf = JSON.parse(confScript.innerHTML);

    document.head.appendChild(getSystemjsImportmap(registryConf.apps));

    return registryConf;
};

function getSystemjsImportmap(apps) {
    const res = {};
    const deps = {};

    /**
     * Need to save app's dependencies based on all merged apps dependencies
     * to avoid duplicate vendors preloads on client side
     * because apps may have common dependencies but from different sources
     *
     * @see {@path ilc/server/tailor/configs-injector.js}
     */
    for (let appName in apps) {
        if (!apps.hasOwnProperty(appName)) {
            continue;
        }

        const app = apps[appName];

        if (app.dependencies !== undefined) {
            Object.assign(deps, app.dependencies);
        }
    }

    const script = document.createElement('script');
    script.type = 'systemjs-importmap';
    script.text = JSON.stringify({imports: Object.assign({}, res, deps)});

    return script;
}
