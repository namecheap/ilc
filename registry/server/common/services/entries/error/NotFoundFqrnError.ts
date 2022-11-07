import {FqrnError} from './FqrnError';

export class NotFoundFqrnError extends FqrnError {
    public code = 404;
}
