import Registry from './Registry';
import wrapWithCache from '../../common/wrapWithCache';
import hashFn from '../../common/hashFn';
import localStorageCache from '../localStorageCache/factory';

export default new Registry(wrapWithCache(localStorageCache, console, hashFn));
