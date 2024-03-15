import { IncomingMessage } from 'http';
import { IlcRegistryConfig } from 'ilc-plugins-sdk/browser';
import ServerRouter from '../tailor/server-router';
import { RegistryConfig } from './RegistryConfig';

export interface IlcState {
    locale?: string;
    forceSpecialRoute?: string;
}

export interface PatchedHttpRequest extends IncomingMessage {
    url: string;
    ldeRelated?: boolean;
    router?: ServerRouter;
    ilcState?: IlcState;
    registryConfig?: RegistryConfig;
}
