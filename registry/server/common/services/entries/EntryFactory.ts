import { IncorrectEntryError } from './error/IncorrectEntryError';
import { SharedLibEntry } from './SharedLibEntry';
import { EntryError } from './error/EntryError';
import { ApplicationEntry } from './ApplicationEntry';
import db from '../../../db';

export class EntryFactory {
    private static resourceIdentifiers = {
        SHARED_LIB: '@sharedLibrary/',
        APP: '@portal/',
    };
    public static getFqrnInstance(identifier: string) {
        if (identifier.startsWith(this.resourceIdentifiers.SHARED_LIB)) {
            const entityIdentifier = this.getEntityIdentifier(identifier, this.resourceIdentifiers.SHARED_LIB);
            return this.getSharedLibInstance(entityIdentifier);
        } else if (identifier.startsWith(this.resourceIdentifiers.APP)) {
            const entityIdentifier = this.getEntityIdentifier(identifier, this.resourceIdentifiers.APP);
            return this.getAppInstance(entityIdentifier);
        }

        throw new IncorrectEntryError(identifier);
    }

    public static getSharedLibInstance(identifier?: string) {
        return new SharedLibEntry(db, identifier);
    }

    public static getAppInstance(identifier?: string) {
        return new ApplicationEntry(db, identifier);
    }

    private static getEntityIdentifier(identifier: string, resourceIdentifiers: string) {
        if (!identifier.startsWith(resourceIdentifiers)) {
            throw new EntryError(
                `Can not get entity identifier of ${identifier} using resource entity ${resourceIdentifiers}`,
            );
        }

        // @sharedLibrary prefix is not a part of name entity in db
        if (resourceIdentifiers === this.resourceIdentifiers.SHARED_LIB) {
            return identifier.substring(resourceIdentifiers.length);
        }

        return identifier;
    }
}
