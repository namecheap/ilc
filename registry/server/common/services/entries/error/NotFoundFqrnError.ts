import { EntryError } from './EntryError';

export class NotFoundFqrnError extends EntryError {
    public override code = 404;
}
