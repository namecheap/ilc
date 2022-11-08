import { NotFoundFqrnError } from './NotFoundFqrnError';

export class NotFoundSharedLibraryError extends NotFoundFqrnError {
    constructor(libraryName: string) {
        super(`Shared library with name "${libraryName}" is not exist`);
    }
}
