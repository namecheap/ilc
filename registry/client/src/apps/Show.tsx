import {
    ArrayField,
    ChipField,
    DataTable,
    ReferenceArrayField,
    ReferenceField,
    SelectField,
    Show,
    SingleFieldList,
    TabbedShowLayout,
    TextField,
    UrlField,
} from 'react-admin';

import { ShowTopToolbar } from '../components';
import { APP_KINDS_WITH_WRAPPER, EMPTY_TEXT } from '../constants';
import { JsonFieldShow } from '../JsonField';
import { Title } from './Title';

export function AppShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <TabbedShowLayout>
                <TabbedShowLayout.Tab label="Summary">
                    <TextField source="name" />
                    <SelectField source="kind" choices={APP_KINDS_WITH_WRAPPER} />
                    <ReferenceField source="enforceDomain" reference="router_domains" emptyText={EMPTY_TEXT}>
                        <TextField source="domainName" />
                    </ReferenceField>
                    <TextField source="wrappedWith" emptyText={EMPTY_TEXT} />
                    <JsonFieldShow
                        source="discoveryMetadata"
                        label="Discovery metadata (can be used to retrieve apps filtered by some metadata fields)."
                    />
                    <TextField source="adminNotes" component="pre" emptyText={EMPTY_TEXT} />
                    <TextField source="namespace" emptyText={EMPTY_TEXT} />
                </TabbedShowLayout.Tab>
                <TabbedShowLayout.Tab label="Assets">
                    <UrlField source="assetsDiscoveryUrl" emptyText={EMPTY_TEXT} />
                    <UrlField source="spaBundle" />
                    <UrlField source="cssBundle" emptyText={EMPTY_TEXT} />
                    <UrlField source="l10nManifest" emptyText={EMPTY_TEXT} />
                    <ArrayField source="dependencies">
                        <DataTable bulkActionButtons={false}>
                            <DataTable.Col label="Name" source="key" />
                            <DataTable.Col label="URL" source="value" field={UrlField} />
                        </DataTable>
                    </ArrayField>
                </TabbedShowLayout.Tab>
                <TabbedShowLayout.Tab label="SSR">
                    <UrlField source="ssr.src" label="URL" emptyText={EMPTY_TEXT} />
                    <TextField source="ssr.timeout" label="Request timeout, in ms" emptyText={EMPTY_TEXT} />
                </TabbedShowLayout.Tab>
                <TabbedShowLayout.Tab label="Props">
                    <ReferenceArrayField reference="shared_props" source="configSelector" label="Shared props selector">
                        <SingleFieldList>
                            <ChipField source="name" />
                        </SingleFieldList>
                    </ReferenceArrayField>
                    <JsonFieldShow source="props" label="Properties that will be passed to application" />
                    <JsonFieldShow
                        source="ssrProps"
                        label="Properties that will be added to main props at SSR request, allow to override certain values"
                    />
                </TabbedShowLayout.Tab>
            </TabbedShowLayout>
        </Show>
    );
}
