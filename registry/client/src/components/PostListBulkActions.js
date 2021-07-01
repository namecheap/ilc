import React, { Fragment, memo } from 'react';
import {
    BulkDeleteButton,
} from 'react-admin';

const PostListBulkActions = memo(props => (
    <Fragment>
        <BulkDeleteButton {...props} />
    </Fragment>
));

export default PostListBulkActions;
