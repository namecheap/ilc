import extendError from '@namecheap/error-extender';

export const RegistryError = extendError('RegistryError');
export const ValidationRegistryError = extendError('ValidationRegistryError', { parent: RegistryError });
export const NotFoundRegistryError = extendError('NotFoundRegistryError', { parent: RegistryError });
