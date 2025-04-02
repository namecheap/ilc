import { IncomingMessage } from 'http';
import ServerRouter from '../tailor/server-router';
import { TransformedRegistryConfig } from './Registry';

export interface IlcState {
    locale?: string;
    forceSpecialRoute?: string;
}

export interface PatchedHttpRequest extends IncomingMessage {
    url: string;
    ldeRelated?: boolean;
    router?: ServerRouter;
    ilcState?: IlcState;
    registryConfig?: TransformedRegistryConfig;
}
