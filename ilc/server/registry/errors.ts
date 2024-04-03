import extendError from '@namecheap/error-extender';

export const RegistryError = extendError('RegistryError', { defaultData: {} });
export const ValidationRegistryError = extendError('ValidationRegistryError', { parent: RegistryError });
export const NotFoundRegistryError = extendError('NotFoundRegistryError', { parent: RegistryError });
