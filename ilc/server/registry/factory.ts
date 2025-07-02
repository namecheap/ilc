import config from 'config';
import { DefaultCacheWrapper } from '../../common/DefaultCacheWrapper';
import { EvictingCacheStorage } from '../../common/EvictingCacheStorage';
import { asyncLocalStorage } from '../context/context';
import reportPlugin from '../plugins/reportingPlugin';
import Registry from './Registry';

export const registryFactory = () => {
    const logger = reportPlugin.getLogger();
    return new Registry(
        config.get('registry.address'),
        new DefaultCacheWrapper(new EvictingCacheStorage({ maxSize: 1000 }), logger, asyncLocalStorage),
        logger,
    );
};
