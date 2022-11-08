import { EntryError } from './EntryError';

export class NotFoundFqrnError extends EntryError {
    public code = 404;
}
