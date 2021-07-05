import React from 'react';

export default (props) => {
    return (<span>{props.record ? `Setting "${props.record.key}"` : ''}</span>);
};
