export class SystemJSImportMap {
    constructor(apps, sharedLibs) {
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

        this.deps = deps;
    }

    configure() {
        const script = document.createElement('script');
        script.type = 'systemjs-importmap';
        script.text = JSON.stringify({ imports: this.deps });
        document.head.appendChild(script);
    }
}
