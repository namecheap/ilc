import extendError from '@namecheap/error-extender';

export const VersioningError = extendError('VersioningError', { defaultData: {} });
export const NonRevertableError = extendError<{ reason: string }>('NonRevertableError', { parent: VersioningError });
export const NonExistingVersionError = extendError('NonExistingVersionError', {
    parent: VersioningError,
});
