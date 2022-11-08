import extendError from '@namecheap/error-extender';

export const VersioningError = extendError('VersioningError');
export const NonRevertableError = extendError<{ reason: string }>('NonRevertableError', { parent: VersioningError });
export const NonExistingVersionError = extendError('NonExistingVersionError', {
    parent: VersioningError,
});
