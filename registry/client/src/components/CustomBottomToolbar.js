import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    usePermissions,
    Toolbar,
    SaveButton,
    DeleteButton,
} from 'react-admin';

const useStyles = makeStyles({
    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
    },
});

const CustomBottomToolbar = ({ alwaysDisableRemove = false, ...props }) => {
    const { permissions } = usePermissions();

    return (
        <Toolbar {...props} classes={useStyles()}>
            { permissions?.buttons.hidden ? null : <SaveButton disabled={props.pristine} />}
            { alwaysDisableRemove || permissions?.buttons.hidden ? null : <DeleteButton />}
        </Toolbar>
    );
};

export default CustomBottomToolbar;
