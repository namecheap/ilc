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
} from 'react-admin'; // eslint-disable-line import/no-unresolved

const ListBulkActions = memo(props => (
    <Fragment>
        <BulkDeleteButton {...props} />
    </Fragment>
));

const ListActionsToolbar = ({ children, ...props }) => {
    const classes = makeStyles({
        toolbar: {
            alignItems: 'center',
            display: 'flex',
            marginTop: -1,
            marginBottom: -1,
        },
    });

    return (
        <div className={classes.toolbar}>
            {Children.map(children, button => cloneElement(button, props))}
        </div>
    );
};

const ListFilter = (props) => (
    <Filter {...props}>
        <BooleanInput label="Show special" source="showSpecial" alwaysOn />
    </Filter>
);

const ListGrid = (props) => {
    return (
        <Datagrid {...props} rowClick="edit" optimized>
            {!props.filterValues.showSpecial ? <TextField source="id" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <TextField source="orderPos" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <TextField source="route" sortable={false} /> : null }
            {!props.filterValues.showSpecial ? <BooleanField source="next" sortable={false} /> : null }
            {props.filterValues.showSpecial ? <TextField source="specialRole" sortable={false} /> : null }
            <TextField source="templateName" emptyText="-" sortable={false} />
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
