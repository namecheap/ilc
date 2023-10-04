import { getLogger } from '../util/logger';

const ignoreMessages = ['.returning() is not supported by mysql'];

export function knexLoggerAdapter() {
    return {
        warn(message: string) {
            if (ignoreMessages.some((x) => message.startsWith(x))) {
                return;
            }
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
