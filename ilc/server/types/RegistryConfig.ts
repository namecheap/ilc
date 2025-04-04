// TODO finish with all values

export type Slot = {
    appName: string;
    kind: 'primary' | 'essential' | 'regular' | null;
    props: {};
};

export type RouteMeta = {
    canonicalUrl?: string;
    [key: string]: unknown;
};

type BaseRoute = {
    slots: Record<string, Slot>;
    meta: RouteMeta;
    next: boolean;
    versionId: string;
    domain?: string;
};

export type Route = BaseRoute & {
    routeId?: number;
    route: string;
    template?: string;
    orderPos: number;
};

export type SpecialRoute = BaseRoute & {
    routeId: number;
    template: string;
    specialRole: string;
};

export type App = {
    kind?: string;
    ssr?: {
        timeout?: number;
        src?: string;
    };
    props?: Record<string, any>;
    ssrProps?: Record<string, any>;
    spaBundle?: string;
    cssBundle?: string;
    enforceDomain?: string;
    wrappedWith?: string;
    l10nManifest?: string;
    versionId?: string;
};

export type DynamicLib = {
    spaBundle: string;
    l10nManifest?: string;
    versionId: string;
};

export interface RegistryConfig {
    apps: Record<string, App>;
    settings: {
        trailingSlash?: string;
        overrideConfigTrustedOrigins?: string;
        i18n?: {
            enabled?: boolean;
            default?: {
                currency?: string;
                locale?: string;
            };
            supported?: {
                currency?: string[];
                locale?: string[];
            };
            routingStrategy?: string;
        };
        cspConfig?: {
            defaultSrc?: string[];
            connectSrc?: string[];
            scriptSrc?: string[];
            styleSrc?: string[];
            fontSrc?: string[];
            imgSrc?: string[];
            workerSrc?: string[];
            frameSrc?: string[];
            reportUri?: string;
        };
        cspEnableStrict?: boolean;
        cspTrustedLocalHosts?: string[];
    };
    routes: Route[];
    specialRoutes: SpecialRoute[];
    sharedLibs: Record<string, string>;
    dynamicLibs: Record<string, DynamicLib>;
}
