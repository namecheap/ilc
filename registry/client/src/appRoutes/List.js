import React, { Children, Fragment, cloneElement, memo } from 'react';
import { useMediaQuery, makeStyles } from '@material-ui/core';
import {
    BulkDeleteButton,
    Datagrid,
    EditButton,
    List,
    SimpleList,
    TextField,
    BooleanField,
    Filter,
    BooleanInput,
    ReferenceInput,
    SelectInput,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

const ListBulkActions = memo(props => (
    <Fragment>
        <BulkDeleteButton {...props} />
    </Fragment>
));

const useStyles = makeStyles({
    toolbar: {
        alignItems: 'center',
        display: 'flex',
        marginTop: -1,
        marginBottom: -1,
    },
    filters: {
        alignItems: 'center',
        marginTop: '0',
    },
    filtersSpecial: {
        marginBottom: '-6px',
    },
});

const ListActionsToolbar = ({ children, ...props }) => {
    const classes = useStyles();

    return (
        <div className={classes.toolbar}>
            {Children.map(children, button => cloneElement(button, props))}
        </div>
    );
};

const ListFilter = (props) => {
    const classes = useStyles();

    return (
        <Filter {...props} className={classes.filters}>
            <BooleanInput label="Show special" source="showSpecial" alwaysOn className={classes.filtersSpecial} />
            <ReferenceInput reference="router_domains"
                alwaysOn
                source="domainId"
                label="Domain">
                <SelectInput resettable optionText="domainName" />
            </ReferenceInput>
        </Filter>
    );
};

const ListGrid = (props) => {

    return (
        <Datagrid {...props} rowClick="edit" optimized>
            {!props.filterValues.showSpecial ? <TextField source="id" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <TextField source="orderPos" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <TextField source="route" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <BooleanField source="next" sortable={false} /> : null }
            {props.filterValues.showSpecial ? <TextField source="specialRole" sortable={false} /> : null }
            <TextField source="templateName" emptyText="-" sortable={false} />
            <TextField source="domainId" label="Domain Id" sortable={false} emptyText="-" />
            <ListActionsToolbar>
                <EditButton />
            </ListActionsToolbar>
        </Datagrid>
    );
};


const PostList = props => {
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    return (
        <List
            {...props}
            bulkActionButtons={<ListBulkActions />}
            exporter={false}
            filters={<ListFilter />}
            perPage={25}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.specialRole ? record.specialRole : record.route}
                    secondaryText={record => `next: ${record.next ? 'true' : 'false'}; template: ${record.templateName || '-'}`}
                />
            ) : (
                <ListGrid />
            )}
        </List>
    );
};

export default PostList;
