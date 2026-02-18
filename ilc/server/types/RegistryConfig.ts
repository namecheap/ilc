import type { Route, SpecialRoute } from '../../common/types/Router';

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
            mediaSrc?: string[];
            childSrc?: string[];
            formAction?: string[];
            manifestSrc?: string[];
            objectSrc?: string[];
            scriptSrcAttr?: string[];
            scriptSrcElem?: string[];
            styleSrcElem?: string[];
            styleSrcAttr?: string[];
            baseUri?: string[];
            frameAncestors?: string[];
            sandbox?: string[];
            upgradeInsecureRequests?: boolean;
        };
        cspEnableStrict?: boolean;
        cspTrustedLocalHosts?: string[];
    };
    routes: Route[];
    specialRoutes: SpecialRoute[];
    sharedLibs: Record<string, string>;
    dynamicLibs: Record<string, DynamicLib>;
    canonicalDomain?: string;
}
