import React from 'react';

export default ({ record }) => {
    return (
        <span>
            {record
                ? `Post "${record.title}"`
                : ''}
        </span>
    );
};
