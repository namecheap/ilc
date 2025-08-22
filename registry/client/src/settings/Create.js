import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Create, ReferenceInput, SelectInput, SimpleForm } from 'react-admin';
import dataProvider from '../dataProvider';
import { Input } from './Input';

const InputForm = ({ ...props }) => {
    const redirect = (basePath, id, data) => {
        const displayedFilters = encodeURIComponent(JSON.stringify({}));
        const filter = encodeURIComponent(JSON.stringify({ enforceDomain: selectedDomainRef.current }));
        return `/settings?displayedFilters=${displayedFilters}&filter=${filter}&order=ASC&page=1&perPage=25&sort=id`;
    };
    const [configState, setConfigState] = useState(null);
    const allowedSettingsRef = useRef(null);
    const selectedDomainRef = useRef(null);

    useEffect(() => {
        dataProvider
            .getList('settings', {
                pagination: false,
                sort: false,
                filter: {
                    allowedForDomains: true,
                },
            })
            .then(({ data }) => {
                allowedSettingsRef.current = data;
            });
    }, []);

    const handleConfigChange = useCallback((event) => {
        const configKey = event.target.value;
        const settings = allowedSettingsRef.current;

        const matchedSetting = settings.find((setting) => setting.key === configKey);

        setConfigState({
            meta: matchedSetting.meta,
            protected: matchedSetting.protected,
        });
    }, []);
    const handleDomainChange = useCallback((event) => {
        selectedDomainRef.current = event.target.value;
    });

    return (
        <SimpleForm {...props} redirect={redirect} initialValues={{ protected: configState?.protected }}>
            <ReferenceInput source="domainId" reference="router_domains" onChange={handleDomainChange}>
                <SelectInput resettable optionText="domainName" />
            </ReferenceInput>
            <ReferenceInput
                source="key"
                reference="settings"
                filter={{ allowedForDomains: true }}
                onChange={handleConfigChange}
            >
                <SelectInput resettable optionText="key" />
            </ReferenceInput>
            {configState ? <Input record={{ meta: configState.meta }} /> : null}
        </SimpleForm>
    );
};

export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create" />
        </Create>
    );
};
