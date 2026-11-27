import { ReferenceField, Show, SimpleShowLayout, TextField } from 'react-admin';

import { ShowTopToolbar } from '../components';
import { JsonFieldShow } from '../JsonField';
import { Title } from './Title';

export function RouterDomainShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <SimpleShowLayout>
                <TextField source="id" />

                <TextField source="domainName" />
                <ReferenceField reference="template" source="template500" label="Template of 500 error">
                    <TextField source="name" />
                </ReferenceField>
                <TextField source="canonicalDomain" label="Canonical Domain" emptyText="-" />
                <JsonFieldShow source="props" label="Properties that will be passed to applications" />
                <JsonFieldShow
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                />
            </SimpleShowLayout>
        </Show>
    );
}
