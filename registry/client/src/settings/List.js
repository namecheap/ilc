import React, {Children, cloneElement} from 'react';
import {useMediaQuery, makeStyles} from '@material-ui/core';
import {
    List,
    Datagrid,
    EditButton,
    BooleanField,
    SimpleList,
    SelectField,
    TextField,
} from 'react-admin';

import {choices, keys} from './dataTransform';

const ListActionsToolbar = ({children, ...props}) => {
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

const Pagination = () => (<div />);

const SourceValueField = (props) => {
    switch (props.record.key) {
        case keys.trailingSlash: {
            return (
                <SelectField {...props} source="value" choices={choices[keys.trailingSlash]} />
            );
        }
        case keys.amdDefineCompatibilityMode:
        case keys.authOpenIdEnabled: {
            return (<BooleanField {...props} source="value" />);
        }
        default: {
            return (<TextField {...props} source="value" />);
        }
    }
}

const PostList = props => {
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    return (
        <List
            {...props}
            exporter={false}
            bulkActionButtons={false}
            pagination={<Pagination />}
        >
            {isSmall
                ? (
                    <SimpleList
                        primaryText={record => record.key}
                        secondaryText={record => record.value}
                    />
                ) : (
                    <Datagrid rowClick="edit" optimized>
                        <TextField source="key" />
                        <SourceValueField />
                        <BooleanField source="secured" />
                        <ListActionsToolbar>
                            <EditButton />
                        </ListActionsToolbar>
                    </Datagrid>
                )}
        </List>
    );
};

export default PostList;
