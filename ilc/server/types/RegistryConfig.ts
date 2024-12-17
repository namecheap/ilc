// TODO finish with all values

export type Slot = {
    appName: string;
    kind: 'primary' | 'essential' | 'regular' | null;
    props: {};
};

export type Route = {
    slots: Record<string, Slot>;
    meta: {};
    routeId?: number;
    route: string;
    next: boolean;
    template?: string;
    orderPos: number;
    versionId: string;
    domain?: string;
};

export type SpecialRoute = {
    slots: Record<string, Slot>;
    meta: {};
    routeId: number;
    next: boolean;
    template: string;
    specialRole: string;
    versionId: string;
    domain?: string;
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
