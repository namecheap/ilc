import config from 'config';
import { DefaultCacheWrapper } from '../../common/DefaultCacheWrapper';
import { EvictingCacheStorage } from '../../common/EvictingCacheStorage';
import { context } from '../context/context';
import reportPlugin from '../plugins/reportingPlugin';
import Registry from './Registry';

export const registryFactory = () => {
    const logger = reportPlugin.getLogger();
    return new Registry(
        config.get('registry.address'),
        new DefaultCacheWrapper(
            new EvictingCacheStorage({
                maxSize: 1000,
                onEvict: (key) =>
                    logger.warn(
                        { key },
                        'ILC registry cache eviction: maxSize (1000) exceeded. ' +
                            'This may be caused by templateProxyHeaders producing too many unique cache keys. ' +
                            'Consider reducing the number of distinct proxy header value combinations.',
                    ),
            }),
            logger,
            context,
        ),
        logger,
    );
};
