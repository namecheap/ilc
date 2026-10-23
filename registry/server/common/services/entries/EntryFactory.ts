import { IncorrectEntryError } from './error/IncorrectEntryError';
import { EntryError } from './error/EntryError';
import { ApplicationEntry } from './ApplicationEntry';
import db from '../../../db';

export class EntryFactory {
    private static resourceIdentifiers = {
        APP: '@portal/',
    };
    // Shared libraries ("@sharedLibrary/") are resolved by the entries router, they have a service of their own
    public static getFqrnInstance(identifier: string) {
        if (identifier.startsWith(this.resourceIdentifiers.APP)) {
            const entityIdentifier = this.getEntityIdentifier(identifier, this.resourceIdentifiers.APP);
            return this.getAppInstance(entityIdentifier);
        }

        throw new IncorrectEntryError(identifier);
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

        return identifier;
    }
}
