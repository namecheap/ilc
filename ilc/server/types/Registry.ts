import type { Logger } from 'ilc-plugins-sdk';
import type { RegistryConfig } from './RegistryConfig';
import { CacheResult } from '../../common/types/CacheWrapper';

export interface TransformedRegistryConfig extends RegistryConfig {
    // TODO
    // Define any additional properties for the transformed config here
}

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
