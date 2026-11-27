import { FunctionField, Show, TabbedShowLayout, TextField, UrlField } from 'react-admin';

import { ShowTopToolbar } from '../components';
import { EMPTY_TEXT } from '../constants';
import { getPrefixedSharedLibName } from './getPrefixedSharedLibName';
import { Title } from './Title';

export function SharedLibShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <TabbedShowLayout>
                <TabbedShowLayout.Tab label="Summary">
                    <FunctionField label="Name" render={(record) => getPrefixedSharedLibName(record.name)} />
                    <TextField source="adminNotes" component="pre" emptyText={EMPTY_TEXT} />
                </TabbedShowLayout.Tab>
                <TabbedShowLayout.Tab label="Assets">
                    <UrlField source="assetsDiscoveryUrl" emptyText={EMPTY_TEXT} />
                    <UrlField source="spaBundle" />
                    <UrlField source="l10nManifest" emptyText={EMPTY_TEXT} />
                </TabbedShowLayout.Tab>
            </TabbedShowLayout>
        </Show>
    );
}
