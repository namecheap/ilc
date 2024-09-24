import { makeStyles } from '@material-ui/core';
import React from 'react';
import { Filter, TextInput } from 'react-admin';

const useStyles = makeStyles({
    filters: {
        alignItems: 'center',
        marginTop: '0',
    },
});

export const ListFilter = ({ routerDomain, ...props }) => {
    const classes = useStyles();

    return (
        <Filter {...props} className={classes.filters}>
            <TextInput label="Name" source="name" alwaysOn resettable />
        </Filter>
    );
};
