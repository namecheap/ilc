import { makeStyles } from '@material-ui/core';
import React from 'react';
import { Filter, TextInput, SelectInput } from 'react-admin';
import { APP_KINDS_WITH_WRAPPER } from '../constants';

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
            <TextInput label="Name" source="q" alwaysOn resettable />
            <SelectInput
                alwaysOn
                source="kind"
                label="Kind"
                optionText="name"
                resettable
                choices={APP_KINDS_WITH_WRAPPER}
            />
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
