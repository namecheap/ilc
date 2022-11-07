import {FqrnError} from './FqrnError';

export class ValidationFqrnError extends FqrnError {
    public code = 422;
}
