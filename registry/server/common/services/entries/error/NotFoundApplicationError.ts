import { NotFoundFqrnError } from './NotFoundFqrnError';

export class NotFoundApplicationError extends NotFoundFqrnError {
    constructor(appName: string) {
        super(`Application with name "${appName}" is not exist`);
    }
}
