import React from 'react';
import { Box, Typography } from '@material-ui/core';
import {
    useListContext,
    CreateButton,
    usePermissions,
} from 'react-admin';

const Empty = () => {
    const { defaultTitle, basePath } = useListContext();
    const { permissions } = usePermissions();

    return (
        <Box textAlign="center" m={1} style={{marginTop: '100px'}}>
            <Typography variant="h4" paragraph>
                No {defaultTitle} yet.
            </Typography>
            { permissions?.buttons.hidden
                ? <Typography variant="body1">You have "{permissions?.role}" permissions, so you can't create new items here.</Typography>
                : <CreateButton basePath={basePath} />
            }
        </Box>
    );
};

export default Empty;
