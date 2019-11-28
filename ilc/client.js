import * as singleSpa from 'single-spa';
import * as Router from './router/Router';

const System = window.System;

// Tailor injects <link> tags near SSRed body of the app inside "slot" tag
// this causes removal of the loaded CSS from the DOM after app unmount.
// So we're "saving" such elements by moving them to the <head>
const cssIncludesToSave = document.body.querySelectorAll('link[data-fragment-id]');
cssIncludesToSave.forEach(v => document.head.append(v));

const confScript = document.querySelector('script[type="spa-config"]');
if (confScript === null) {
    throw new Error('Can\'t find single-spa config');
}

const registryConf = JSON.parse(confScript.innerHTML);

const router = new Router(registryConf);
let currentPath = router.match(window.location.pathname + window.location.search);

for (let appName in registryConf.apps) {
    if (!registryConf.apps.hasOwnProperty(appName)) {
        continue;
    }

    singleSpa.registerApplication(
        appName.replace('@portal/', ''),
        () => {
            const waitTill = [System.import(appName)];
            const appConf = registryConf.apps[appName];

            if (appConf.cssBundle !== undefined) {
                waitTill.push(System.import(appConf.cssBundle).then((module) => {
                    /**
                     * CSS modules export a Constructable Stylesheet instance as their default export when imported
                     * @see {@link https://github.com/systemjs/systemjs/blob/master/docs/module-types.md#css-modules}
                     * @see {@link https://github.com/w3c/webcomponents/blob/gh-pages/proposals/css-modules-v1-explainer.md}
                     * @see {@link https://github.com/calebdwilliams/construct-style-sheets}
                     */
                    const styleSheet = module.default;
                    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
                }));
            }

            return Promise.all(waitTill).then(v => v[0].mainSpa !== undefined ? v[0].mainSpa(appConf.initProps || {}) : v[0]);
        },
        isActiveFactory(appName),
        {
            fragmentName: appName,
            domElementGetter: getMountPointFactory(appName),
            getCurrentPathProps: getCurrentPathPropsFactory(appName),
            getCurrentBasePath,
        }
    );
}

function getMountPointFactory(appName) {
    return () => {
        const elId = Object.entries(currentPath.slots).find(([k, v]) => v.appName === appName)[0];
        return document.getElementById(elId)
    };
}

function isActiveFactory(appName) {
    return () => Object.values(currentPath.slots).map(v => v.appName).includes(appName)
}

function getCurrentPathPropsFactory(appName) {
    return () => {
        const appProps = registryConf.apps[appName].props || {};
        const routeProps = Object.values(currentPath.slots).find(v => v.appName === appName).props || {};

        return Object.assign({}, appProps, routeProps);
    }
}

function getCurrentBasePath() {
    return currentPath.basePath;
}

window.addEventListener('single-spa:before-routing-event', () => {
    //console.log('Called: "single-spa:before-routing-event"');

    const path = router.match(window.location.pathname + window.location.search);
    if (currentPath !== null && path.template !== currentPath.template) {
        throw new Error('Base template was changed and I still don\'t know how to handle it :(');
    }

    currentPath = path;
});

document.addEventListener('click', function (e) {
    if (e.target.tagName !== 'A' || !e.target.hasAttribute('href')) {
        return;
    }

    const href = e.target.getAttribute('href');
    singleSpa.navigateToUrl(href);
    e.preventDefault();
});

window.addEventListener('error', function(event) {
    const moduleInfo = System.getModuleInfo(event.filename);
    if (moduleInfo === null) {
        return;
    }

    event.preventDefault();

    console.error(JSON.stringify({
        type: 'MODULE_ERROR',
        name: event.error.toString(),
        moduleName: moduleInfo.name,
        dependants: moduleInfo.dependants,
        stack: event.error.stack.split("\n"),
        location: {
            fileName: event.filename,
            lineNo: event.lineno,
            colNo: event.colno,
        }
    }));
});

window.addEventListener('ilcFragmentError', function(event) {
    console.error(JSON.stringify({
        type: 'FRAGMENT_ERROR',
        name: event.detail.error.toString(),
        moduleName: event.detail.moduleInfo.name,
        extraInfo: event.detail.extraInfo,
        stack: event.detail.error.stack.split("\n"),
    }));
});

singleSpa.start();
