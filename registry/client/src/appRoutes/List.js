import React, { Children, Fragment, cloneElement, memo } from 'react';
import { useMediaQuery, makeStyles } from '@material-ui/core';
import {
    BulkDeleteButton,
    Datagrid,
    EditButton,
    List,
    SimpleList,
    TextField,
    ChipField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

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
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.route}
                />
            ) : (
                <Datagrid rowClick="edit" optimized>
                    <TextField source="id" />
                    <TextField source="orderPos" />
                    <TextField source="route" />
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
