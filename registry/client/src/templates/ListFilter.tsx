import type { ReactElement } from 'react';
import { SelectInput, type RaRecord } from 'react-admin';

export function getListFilters(routerDomains: RaRecord[]): ReactElement[] {
    if (!routerDomains.length) {
        return [];
    }

    return [
        <SelectInput
            key="domainId"
            id="domainId"
            alwaysOn
            source="domainId"
            label="Domain"
            optionText="domainName"
            resettable
            choices={routerDomains}
        />,
    ];
}
