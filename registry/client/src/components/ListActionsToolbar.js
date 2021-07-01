import React, { Children, cloneElement } from 'react';
import { makeStyles } from '@material-ui/core';
import { usePermissions } from 'react-admin';

const classes = makeStyles({
    toolbar: {
        alignItems: 'center',
        display: 'flex',
        marginTop: -1,
        marginBottom: -1,
    },
});

const ListActionsToolbar = ({ children, ...props }) => {
    const { permissions } = usePermissions();

    if (permissions?.buttons.hidden) {
        return null;
    }

    return (
        <div className={classes.toolbar}>
            {Children.map(children, button => cloneElement(button, props))}
        </div>
    );
};

export default ListActionsToolbar;
