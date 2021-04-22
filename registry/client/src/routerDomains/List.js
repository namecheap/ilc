import React, { Children, Fragment, cloneElement, memo } from 'react';
import { useMediaQuery, makeStyles } from '@material-ui/core';
import {
    BulkDeleteButton,
    Datagrid,
    EditButton,
    List,
    SimpleList,
    TextField,
    ReferenceField,
} from 'react-admin';

const PostListBulkActions = memo(props => (
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

const PostList = props => {
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            bulkActionButtons={<PostListBulkActions />}
            exporter={false}
            perPage={10}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.id}
                    secondaryText={record => record.domainName}
                />
            ) : (
                <Datagrid rowClick="edit" optimized>
                    <TextField source="id" sortable={false} />
                    <TextField source="domainName" sortable={false} />
                    <ReferenceField label="Template 500" source="template500" reference="template" emptyText="-" sortable={false}>
                        <TextField source="name" />
                    </ReferenceField>
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
