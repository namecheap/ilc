import React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleShowLayout {...props} toolbar={null}>
                <TextField source="name" />
                <TextField source="content" component="pre" />
            </SimpleShowLayout>
        </Show>
    );
};