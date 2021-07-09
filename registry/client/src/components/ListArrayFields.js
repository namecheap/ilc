import React from 'react';
import { Labeled } from 'react-admin';

const ListArrayFields = ({ record, source, children, ...rest }) => {
    const list = record[source];

    if (!list || !list.length) {
        return null;
    }

    return (
        <>
            {
                list.map(listItem => (
                    React.Children.map(children, field => (
                            <div>
                                <Labeled label={field.props.label} fullWidth>
                                    {React.cloneElement(field, {
                                        record: listItem,
                                        ...field.props,
                                        ...rest,
                                        addLabel: false,
                                    })}
                                </Labeled>
                            </div>
                        )
                    )
                ))
            }
        </>
    )
};

export default ListArrayFields;
