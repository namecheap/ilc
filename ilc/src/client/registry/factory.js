import Registry from './Registry';
import wrapWithCache from '../../common/wrapWithCache';
import * as localStorage from '../../common/localStorage';

export default new Registry(wrapWithCache(localStorage, console));
