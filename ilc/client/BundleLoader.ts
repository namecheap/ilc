import { CssTrackedApp } from './CssTrackedApp';
import { exponentialRetry, ExponentialRetryOptions } from './utils/exponentialRetry';
import { ILCAdapter } from './types/ILCAdapter';
import { DecoratedApp } from './types/DecoratedApp';

interface ModuleLoader {
    import(moduleId: string): Promise<any>;
    resolve(moduleId: string): string;
    get(moduleId: string): any;
    delete(moduleId: string): void;
}

type Props = Record<string, unknown>;

interface AppConfig {
    spaBundle?: string;
    cssBundle?: string;
    props?: Props;
    wrappedWith?: string;
}

interface ConfigRoot {
    getConfigForApps(): Record<string, AppConfig>;
    getConfigForAppByName(appName: string): AppConfig | undefined;
    isGlobalSpinnerEnabled(): boolean;
}

type SdkFactory = (applicationId: string) => any;

interface SdkFactoryBuilder {
    getSdkFactoryByApplicationName(appName: string): SdkFactory;
}

interface LoadAppOptions {
    injectGlobalCss?: boolean;
    retryOptions?: ExponentialRetryOptions;
}

interface AppBundle {
    mainSpa?: (props: Props, options: { sdkFactory: SdkFactory }) => ILCAdapter;
    default?: {
        mainSpa?: (props: Props, options: { sdkFactory: SdkFactory }) => ILCAdapter;
        mount?: Function;
    };
    mount?: Function;
}

export const emptyClientApplication: ILCAdapter = Object.freeze({
    mount: () => Promise.resolve(),
    unmount: () => Promise.resolve(),
    bootstrap: () => Promise.resolve(),
});

export class BundleLoader {
    private cache = new WeakMap<AppBundle, ILCAdapter>();
    private registryApps: Record<string, AppConfig>;
    private moduleLoader: ModuleLoader;
    private delayCssRemoval: boolean;
    private configRoot: ConfigRoot;
    private sdkFactoryBuilder: SdkFactoryBuilder;

    constructor(configRoot: ConfigRoot, moduleLoader: ModuleLoader, sdkFactoryBuilder: SdkFactoryBuilder) {
        this.registryApps = configRoot.getConfigForApps();
        this.delayCssRemoval = configRoot.isGlobalSpinnerEnabled();
        this.moduleLoader = moduleLoader;
        this.configRoot = configRoot;
        this.sdkFactoryBuilder = sdkFactoryBuilder;
    }

    /**
     * Speculative preload of the JS bundle.
     * We don't care about result as we do it only to heat up browser HTTP cache
     */
    preloadApp(appName: string): void {
        const app = this.getApp(appName);

        if (!app.spaBundle) {
            return;
        }

        this.moduleLoader.import(app.spaBundle).catch(() => {});

        if (app.wrappedWith) {
            this.preloadApp(app.wrappedWith);
        }
    }

    /**
     * Load an application with optional CSS injection and retry options
     */
    loadApp(appName: string, options: LoadAppOptions = {}): Promise<ILCAdapter | DecoratedApp> {
        const { injectGlobalCss = true, retryOptions } = options;
        const applicationConfig = this.getApp(appName);

        if (!applicationConfig.spaBundle) {
            // it is SSR only app
            return Promise.resolve(emptyClientApplication);
        }

        return exponentialRetry(() => this.moduleLoader.import(appName), retryOptions).then((appBundle: AppBundle) => {
            const sdkInstanceFactory = this.sdkFactoryBuilder.getSdkFactoryByApplicationName(appName);
            const rawCallbacks = this.getAppSpaCallbacks(appBundle, applicationConfig.props, {
                sdkFactory: sdkInstanceFactory,
            });
            const application =
                typeof applicationConfig.cssBundle === 'string' && injectGlobalCss !== false
                    ? new CssTrackedApp(rawCallbacks, applicationConfig.cssBundle, {
                          delayCssRemoval: this.delayCssRemoval,
                      }).getDecoratedApp()
                    : rawCallbacks;
            return application;
        });
    }

    loadAppWithCss(appName: string): Promise<ILCAdapter | DecoratedApp> {
        const app = this.getApp(appName);
        const waitTill: Promise<any>[] = [this.loadApp(appName)];

        if (app.cssBundle) {
            waitTill.push(this.loadCss(app.cssBundle));
        }

        return Promise.all(waitTill).then((values) => values[0]);
    }

    loadCss(url: string): Promise<void> {
        return this.moduleLoader.import(url).catch((err: Error) => {
            //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
            //TODO: error handling should be improved, need to submit PR with typed errors
            if (
                typeof err.message !== 'string' ||
                err.message.indexOf('has already been loaded using another way') === -1
            ) {
                throw err;
            }
        });
    }

    /**
     * Unload an application and clean up its cache
     */
    unloadApp(appName: string): void {
        const moduleId = this.moduleLoader.resolve(appName);
        const appBundle = this.moduleLoader.get(moduleId);
        this.cache.delete(appBundle);
        this.moduleLoader.delete(moduleId);
    }

    private getApp = (appName: string): AppConfig => {
        const app = this.configRoot.getConfigForAppByName(appName);
        if (!app) {
            throw new Error(`Unable to find requested app "${appName}" in Registry`);
        }

        return app;
    };

    private getAppSpaCallbacks = (
        appBundle: AppBundle,
        props: Props = {},
        { sdkFactory }: { sdkFactory: SdkFactory; cacheEnabled?: boolean },
    ): ILCAdapter => {
        // We do this to make sure that mainSpa function will be called only once
        if (this.cache.has(appBundle)) {
            return this.cache.get(appBundle)!;
        }

        const mainSpa = appBundle.mainSpa || (appBundle.default && appBundle.default.mainSpa);

        if (mainSpa !== undefined && typeof mainSpa === 'function') {
            const res = mainSpa(props, { sdkFactory });
            this.cache.set(appBundle, res);
            return res;
        } else {
            if (appBundle.default && typeof appBundle.default.mount === 'function') {
                return appBundle.default as ILCAdapter;
            }

            return appBundle as ILCAdapter;
        }
    };
}
