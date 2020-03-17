import deepmerge from "deepmerge";

export default function () {
    const confScript = document.querySelector('script[type="spa-config"]');
    if (confScript === null) {
        throw new Error('Can\'t find single-spa config');
    }

    const registryConf = JSON.parse(confScript.innerHTML);

    Array.prototype.slice.call(document.querySelectorAll('script[type="spa-config-override"]')).map(el => {
        const conf = JSON.parse(el.innerHTML);
        registryConf.apps = deepmerge(registryConf.apps, conf);
    });
    document.body.appendChild(getSystemjsImportmap(registryConf.apps));

    return registryConf;
}


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

        res[appName] = app.spaBundle;

        if (app.dependencies !== undefined) {
            Object.assign(deps, app.dependencies);
        }
    }

    const script = document.createElement('script');
    script.type = 'systemjs-importmap';
    script.text = JSON.stringify({imports: Object.assign({}, res, deps)});

    return script;
}
