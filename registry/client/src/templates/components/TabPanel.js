import { Box, Paper } from '@material-ui/core';
import React from 'react';

export function TabPanel(props) {
    const {children, selected, value, ...restProps} = props;

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
                        {React.cloneElement(children, restProps)}
                    </Box>
                </Paper>
            )}
        </div>
    );
}
