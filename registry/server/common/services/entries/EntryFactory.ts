import {IncorrectFqrnError} from './error/IncorrectFqrnError';
import {SharedLibEntry} from './SharedLibEntry';
import {FqrnError} from './error/FqrnError';
import {ApplicationEntry} from './ApplicationEntry';

export class EntryFactory {
    private static resourceIdentifiers = {
        SHARED_LIB: '@sharedLibrary/',
        APP: '@portal/',
    }
    public static getFqrnInstance(identifier: string) {
        if (identifier.startsWith(this.resourceIdentifiers.SHARED_LIB)) {
            const entityIdentifier = this.getEntityIdentifier(identifier, this.resourceIdentifiers.SHARED_LIB);
            return this.getSharedLibInstance(entityIdentifier);
        } else if(identifier.startsWith(this.resourceIdentifiers.APP)) {
            const entityIdentifier = this.getEntityIdentifier(identifier, this.resourceIdentifiers.APP);
            return this.getAppInstance(entityIdentifier);
        } else {
            throw new IncorrectFqrnError(identifier);
        }
    }

    public static getSharedLibInstance(identifier?: string) {
        return new SharedLibEntry(identifier);
    }

    public static getAppInstance(identifier?: string) {
        return new ApplicationEntry(identifier);
    }

    private static getEntityIdentifier(identifier: string, resourceIdentifiers: string) {
        if(!identifier.startsWith(resourceIdentifiers)) {
            throw new FqrnError(`Can not get entity identifier of ${identifier} using resource entity ${resourceIdentifiers}`);
        }

        return identifier;
    }
}
