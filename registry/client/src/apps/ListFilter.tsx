import type { ReactElement } from 'react';
import { SelectInput, TextInput, type RaRecord } from 'react-admin';

import { APP_KINDS_WITH_WRAPPER } from '../constants';

export function getListFilters(routerDomains: RaRecord[]): ReactElement[] {
    const filters = [
        <TextInput key="q" label="Name" source="q" alwaysOn resettable />,
        <SelectInput
            key="kind"
            id="kind"
            alwaysOn
            source="kind"
            label="Kind"
            optionText="name"
            resettable
            choices={APP_KINDS_WITH_WRAPPER}
        />,
    ];

    if (routerDomains.length) {
        filters.push(
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
        );
    }

    return filters;
}
