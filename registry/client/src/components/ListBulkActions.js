import React, { Fragment, memo } from 'react';
import {
    BulkDeleteButton,
} from 'react-admin';

const ListBulkActions = memo(props => (
    <Fragment>
        <BulkDeleteButton {...props} />
    </Fragment>
));

export default ListBulkActions;
