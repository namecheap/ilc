import {FqrnError} from './FqrnError';

export class IncorrectFqrnError extends FqrnError {
    public code = 422;
    constructor(fqrn: string) {
        super(`Fully qualified resource name ${fqrn} is not exist`);
    }
}
