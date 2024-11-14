import type { Logger } from 'ilc-plugins-sdk';
import type { IlcLogger } from 'ilc-plugins-sdk/browser';
import { DefaultCacheWrapper } from '../../common/DefaultCacheWrapper';
import { BrowserCacheStorage } from './BrowserCacheStorage';
import Registry from './Registry';

export const registryFactory = (logger: IlcLogger) =>
    new Registry(new DefaultCacheWrapper(new BrowserCacheStorage(window.localStorage), logger as Logger));
