import { makeStyles } from '@material-ui/core';
import React from 'react';
import { Filter, SelectInput } from 'react-admin';

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
            {routerDomain.length ? (
                <SelectInput
                    alwaysOn
                    source="domainId"
                    label="Domain"
                    optionText="domainName"
                    resettable
                    choices={routerDomain}
                />
            ) : null}
        </Filter>
    );
};
