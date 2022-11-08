import { EntryError } from './EntryError';

export class ValidationFqrnError extends EntryError {
    public code = 422;
}
