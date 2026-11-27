import { useMediaQuery, type Theme } from '@mui/material';
import {
    BooleanField,
    BooleanInput,
    CreateButton,
    DataTable,
    Filter,
    FilterFormClasses,
    List,
    ReferenceField,
    SelectInput,
    SimpleList,
    TextField,
    TextInput,
    TopToolbar,
    useListContext,
    type RaRecord,
} from 'react-admin';

import { Empty, ProtectedEditButton } from '../components';
import { useRouterDomainFilterChoices } from '../routerDomains/useRouterDomains';

interface ListFilterProps {
    routerDomains: RaRecord[];
    /** Set by the list: it renders the filters as a form and as a button that adds the hidden ones */
    context?: 'form' | 'button';
}

/** A component instead of a list of inputs, because the route prefix filter depends on the "Show special" one */
function ListFilter({ routerDomains, context }: ListFilterProps) {
    const { filterValues } = useListContext();

    return (
        <Filter context={context}>
            <BooleanInput
                label="Show special"
                source="showSpecial"
                alwaysOn
                // The margins react-admin gives the fields of a filter, so the switch centres on the same line
                sx={{ marginTop: 1, marginBottom: 0.5 }}
            />
            {routerDomains.length ? (
                <SelectInput
                    id="domainId"
                    alwaysOn
                    source="domainId"
                    label="Domain"
                    optionText="domainName"
                    resettable
                    choices={routerDomains}
                />
            ) : null}
            {!filterValues.showSpecial ? (
                <TextInput label="Route prefix" source="routePrefix" alwaysOn resettable />
            ) : null}
        </Filter>
    );
}

function ListGrid() {
    const { filterValues } = useListContext();
    const showSpecial = !!filterValues.showSpecial;

    return (
        <DataTable rowClick="show">
            {!showSpecial && <DataTable.Col source="id" disableSort />}
            {!showSpecial && <DataTable.Col source="orderPos" disableSort />}
            {!showSpecial && <DataTable.Col source="route" disableSort />}
            {!showSpecial && <DataTable.Col source="next" disableSort field={BooleanField} />}
            {showSpecial && <DataTable.Col source="specialRole" disableSort />}
            <DataTable.Col label="Template Name" source="templateName" disableSort>
                <ReferenceField source="templateName" reference="template" emptyText="-">
                    <TextField source="name" />
                </ReferenceField>
            </DataTable.Col>
            <DataTable.Col label="Domain Name" source="domainId" disableSort>
                <ReferenceField source="domainId" reference="router_domains" emptyText="-">
                    <TextField source="domainName" />
                </ReferenceField>
            </DataTable.Col>
            <DataTable.Col>
                <ProtectedEditButton />
            </DataTable.Col>
        </DataTable>
    );
}

function ListActions() {
    const { filterValues } = useListContext();
    const showSpecial = !!filterValues.showSpecial;

    return (
        <TopToolbar>
            <CreateButton
                to={{ pathname: '/route/create', search: showSpecial ? '?special=1' : '' }}
                label={showSpecial ? 'Create special route' : 'Create'}
            />
        </TopToolbar>
    );
}

export function AppRouteList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
    const routerDomains = useRouterDomainFilterChoices();

    return (
        <List
            empty={<Empty />}
            exporter={false}
            filters={<ListFilter routerDomains={routerDomains} />}
            perPage={25}
            actions={<ListActions />}
            // react-admin aligns the filters by their bottom edge, and the switch is lower than the fields
            sx={{ [`& .${FilterFormClasses.filterFormInput}`]: { alignSelf: 'center' } }}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={(record) => (record.specialRole ? record.specialRole : record.route)}
                    secondaryText={(record) =>
                        `next: ${record.next ? 'true' : 'false'}; template: ${record.templateName || '-'}`
                    }
                />
            ) : (
                <ListGrid />
            )}
        </List>
    );
}
