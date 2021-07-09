import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Auth Entity "${record.identifier}"` : ''}</span>);
};
