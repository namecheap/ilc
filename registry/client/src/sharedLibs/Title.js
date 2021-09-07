import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Shared library "${record.name}"` : ''}</span>);
};
