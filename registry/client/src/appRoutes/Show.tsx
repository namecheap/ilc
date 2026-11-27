import { Typography } from '@mui/material';
import {
    ArrayField,
    BooleanField,
    RecordsIterator,
    ReferenceField,
    SelectField,
    Show,
    SimpleShowLayout,
    TabbedShowLayout,
    TextField,
    useRecordContext,
} from 'react-admin';

import { ShowTopToolbar } from '../components';
import { APP_KINDS, EMPTY_TEXT, SPECIAL_ROLES } from '../constants';
import { JsonFieldShow } from '../JsonField';
import { useRouterDomains } from '../routerDomains/useRouterDomains';
import { Title } from './Title';

function ShowLayout() {
    const record = useRecordContext();
    const isMultiDomain = useRouterDomains().length > 0;

    return (
        <TabbedShowLayout>
            <TabbedShowLayout.Tab label="General">
                <TextField source="id" />
                {record?.specialRole && (
                    <SelectField source="specialRole" label="Special role" choices={SPECIAL_ROLES} />
                )}
                {!record?.specialRole && <TextField source="route" label="Route" />}
                {!record?.specialRole && <TextField source="orderPos" label="Order position of the route" />}
                {!record?.specialRole && <BooleanField source="next" />}

                <ReferenceField reference="template" source="templateName" label="Template name" emptyText={EMPTY_TEXT}>
                    <TextField source="name" />
                </ReferenceField>
                {isMultiDomain ? (
                    <ReferenceField reference="router_domains" source="domainId" label="Domain" emptyText={EMPTY_TEXT}>
                        <TextField source="domainName" />
                    </ReferenceField>
                ) : null}
                <JsonFieldShow source="meta" label="Metadata" />
                <TextField source="namespace" emptyText={EMPTY_TEXT} />
            </TabbedShowLayout.Tab>
            <TabbedShowLayout.Tab label="Slots">
                {record?.slots?.length ? (
                    <ArrayField source="slots" label={false}>
                        <RecordsIterator>
                            <SimpleShowLayout>
                                <TextField source="key" label="Slot name" />
                                <ReferenceField reference="app" source="appName" label="App name" link="edit">
                                    <TextField source="name" />
                                </ReferenceField>
                                <SelectField
                                    source="kind"
                                    label="App type"
                                    emptyText={EMPTY_TEXT}
                                    choices={APP_KINDS}
                                />
                                <JsonFieldShow
                                    source="props"
                                    label="Properties that will be passed to application at current route"
                                />
                            </SimpleShowLayout>
                        </RecordsIterator>
                    </ArrayField>
                ) : (
                    <Typography variant="h4">There are no slots for this route</Typography>
                )}
            </TabbedShowLayout.Tab>
        </TabbedShowLayout>
    );
}

export function AppRouteShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <ShowLayout />
        </Show>
    );
}
