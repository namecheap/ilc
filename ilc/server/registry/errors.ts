import { extendError } from '../../common/utils';

export const RegistryError = extendError('RegistryError', { defaultData: {} });
export const ValidationRegistryError = extendError('ValidationRegistryError', {
    parent: RegistryError,
    defaultData: {},
});
export const NotFoundRegistryError = extendError('NotFoundRegistryError', { parent: RegistryError, defaultData: {} });
