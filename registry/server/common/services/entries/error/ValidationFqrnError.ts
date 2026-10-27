import { EntryError } from './EntryError';

export class ValidationFqrnError extends EntryError {
    public override code = 422;
}
