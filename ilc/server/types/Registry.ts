import type { Logger } from 'ilc-plugins-sdk';
import type { RegistryConfig, Route, SpecialRoute } from './RegistryConfig';
import { CacheResult } from '../../common/types/CacheWrapper';

export type TransformedRoute = Omit<Route, 'domain'>;
export type TransformedSpecialRoute = Omit<SpecialRoute, 'domain' | 'specialRole'>;

export type TransformedRegistryConfig = RegistryConfig & {
    routes: TransformedRoute[];
    specialRoutes: Record<string, TransformedSpecialRoute>;
    // TODO
    // Define any additional properties for the transformed config here
};

interface RegistryOptions {
    filter?: {
        domain?: string;
    };
}

interface TemplateOptions {
    locale?: string;
    forDomain?: string;
}

interface Template {
    content: string;
    styleRefs: string[];
}

export interface Registry {
    new (address: string, cacheWrapper: Function, logger: Logger): Registry;

    preheat(): Promise<void>;

    getConfig(options?: RegistryOptions): Promise<TransformedRegistryConfig>;

    getTemplate(templateName: string, options?: TemplateOptions): Promise<CacheResult<Template>>;
}
