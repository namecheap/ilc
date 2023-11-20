import Registry from './Registry';
import CacheWrapper from '../../common/CacheWrapper';
import * as localStorage from '../../common/localStorage';

export default new Registry(new CacheWrapper(localStorage, console));
