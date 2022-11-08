import { EntryError } from './EntryError';

export class IncorrectEntryError extends EntryError {
    public code = 422;
    constructor(fqrn: string) {
        super(`Fully qualified resource name ${fqrn} is not exist`);
    }
}
