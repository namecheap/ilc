import React from 'react';
import { Tooltip } from "@material-ui/core";
import HelpIcon from "@material-ui/icons/Help";

export default ({ title, children }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            { children}
            <div style={{ marginLeft: '10px' }}>
                <Tooltip title={title}>
                    <HelpIcon style={{ color: '#aaa' }} />
                </Tooltip>
                <div>&#8203;</div>
            </div>
        </div>
    );
}
