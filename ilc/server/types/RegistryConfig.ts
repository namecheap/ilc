// TODO finish with all values

export type Slot = {
    appName: string;
    kind: 'primary' | 'essential' | 'regular' | null;
    props: {};
};

type BaseRoute = {
    slots: Record<string, Slot>;
    meta: {};
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

export interface RegistryConfig {
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
}
