import config from 'config';
import { DefaultCacheWrapper } from '../../common/DefaultCacheWrapper';
import { MemoryCacheStorage } from '../../common/MemoryCacheStorage';
import { context } from '../context/context';
import reportPlugin from '../plugins/reportingPlugin';
import Registry from './Registry';

export const registryFactory = () => {
    const logger = reportPlugin.getLogger();
    return new Registry(
        config.get('registry.address'),
        new DefaultCacheWrapper(new MemoryCacheStorage(), logger, context),
        logger,
    );
};
