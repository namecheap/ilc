import React, {Children, cloneElement} from 'react';
import {useMediaQuery, makeStyles} from '@material-ui/core';
import {
    List,
    Datagrid,
    EditButton,
    SimpleList,
    TextField,
    SelectInput,
    TextInput,
    Filter,
} from 'react-admin';

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

const MyFilter = (props) => (
    <Filter {...props}>
        <SelectInput label="Entity Type" source="entity_type" choices={[{id: 'apps', name: 'Apps'}, {id: 'routes', name: 'Routes'}]} alwaysOn/>
        <TextInput label="Entity ID" source="entity_id" alwaysOn />
    </Filter>
);


const MyPanel = ({ id, record, resource }) => (
    <div dangerouslySetInnerHTML={{ __html: record.data }} />
);

const PostList = props => {
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    return (
        <List
            {...props}
            filters={<MyFilter/>}
            exporter={false}
            perPage={25}
            bulkActionButtons={false}
        >
            {isSmall
                ? (
                    <SimpleList
                        primaryText={record => record.key}
                        secondaryText={record => record.value}
                    />
                ) : (
                    <Datagrid expand={<MyPanel />} optimized>
                        <TextField source="id" />
                        <TextField source="entity_type" />
                        <TextField source="entity_id" />
                        <TextField source="created_by" />
                        <TextField source="created_at" />
                        <ListActionsToolbar>
                            <EditButton />
                        </ListActionsToolbar>
                    </Datagrid>
                )}
        </List>
    );
};

export default PostList;
