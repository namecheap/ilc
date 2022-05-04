import React from 'react';
import { Labeled } from 'react-admin';
import Typography from '@material-ui/core/Typography';

const ListArrayFields = ({ record, source, children, emptyText, ...rest }) => {
    const list = record[source];

    if (!list || !list.length) {
        if (emptyText) {
            return (
                <Typography component="center" variant="h4">
                    {emptyText}
                </Typography>
            );
        }

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
