import { getLogger } from '../util/logger';

export function knexLoggerAdapter() {
    return {
        warn(message: string) {
            getLogger().warn(message);
        },
        error(message: string) {
            getLogger().error(message);
        },
        deprecate(message: string) {
            getLogger().warn(message);
        },
        debug(message: string) {
            getLogger().debug(message);
        },
    };
}
