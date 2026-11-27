import { useState } from 'react';
import { Create, ReferenceInput, SelectInput, SimpleForm, useGetList, type RaRecord } from 'react-admin';

import { Input } from './Input';

// Only some settings can be overridden for a router domain
const ALLOWED_FOR_DOMAINS = { allowedForDomains: true };

/** The list of the settings of a router domain */
function getListPath(domainId: unknown) {
    return `settings?${new URLSearchParams({ filter: JSON.stringify({ enforceDomain: domainId ?? null }) })}`;
}

/**
 * Overrides a setting for a router domain.
 */
export function SettingCreate() {
    const { data: allowedSettings = [] } = useGetList('settings', {
        filter: ALLOWED_FOR_DOMAINS,
        pagination: { page: 1, perPage: 1000 },
    });
    const [setting, setSetting] = useState<RaRecord>();

    function findSetting(key: unknown) {
        return allowedSettings.find((allowed) => allowed.key === key);
    }

    function validateKey(key: unknown) {
        return findSetting(key)?.protected ? `The '${key}' setting cannot be modified through UI` : undefined;
    }

    return (
        <Create redirect={(_resource, _id, data) => getListPath(data?.domainId)}>
            <SimpleForm>
                <ReferenceInput source="domainId" reference="router_domains">
                    <SelectInput id="domainId" resettable optionText="domainName" />
                </ReferenceInput>
                <ReferenceInput source="key" reference="settings" filter={ALLOWED_FOR_DOMAINS}>
                    <SelectInput
                        id="key"
                        resettable
                        optionText="key"
                        validate={validateKey}
                        onChange={(event) => setSetting(findSetting(event.target.value))}
                    />
                </ReferenceInput>
                {setting?.meta ? <Input meta={setting.meta} /> : null}
            </SimpleForm>
        </Create>
    );
}
