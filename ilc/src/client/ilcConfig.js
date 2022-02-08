import { decodeHtmlEntities } from '../common/utils';

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

    const customHTML = registryConf.settings?.globalSpinner.customHTML;
    if (customHTML) {
        registryConf.settings.globalSpinner.customHTML = decodeHtmlEntities(customHTML);
    }

    document.head.appendChild(getSystemjsImportmap(registryConf.apps, registryConf.sharedLibs));

    return registryConf;
};

function getSystemjsImportmap(apps, sharedLibs) {
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
        deps[appName] = app.spaBundle;

        if (app.dependencies !== undefined) {
            Object.assign(deps, app.dependencies);
        }
    }

    for (const name in sharedLibs) {
        deps[`@sharedLibrary/${name}`] = sharedLibs[name];
    }

    const script = document.createElement('script');
    script.type = 'systemjs-importmap';
    script.text = JSON.stringify({ imports: deps });

    return script;
}
