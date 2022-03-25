import { Box, Paper } from '@material-ui/core';
import React from 'react';

export function TabPanel(props) {
    const {children, selected, value} = props;

    return (
        <div
            role="tabpanel"
            hidden={selected !== value}
            id={`locale-panel-${value}`}
            aria-labelledby={`locale-${value}`}
        >
            {selected === value && (
                <Paper>
                    <Box p={2}>
                        {children}
                    </Box>
                </Paper>
            )}
        </div>
    );
}
