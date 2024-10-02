import { extendError } from '../util/extendError';

export const VersioningError = extendError('VersioningError', { defaultData: {} });
export const NonRevertableError = extendError<{ reason: string }>('NonRevertableError', { parent: VersioningError });
export const NonExistingVersionError = extendError('NonExistingVersionError', {
    parent: VersioningError,
    defaultData: {},
});
