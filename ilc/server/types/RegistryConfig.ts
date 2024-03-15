// TODO finish with all values

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
}
