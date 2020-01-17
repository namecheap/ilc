import Registry from './Registry';
import wrapFetchWithCache from '../../common/wrapWithCache';

export default new Registry({
    wrapFetchWithCache,
});
