import React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';
import { EMPTY_TEXT } from '../constants';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleShowLayout {...props} toolbar={null}>
                <TextField source="identifier" />
                <TextField source="provider" />
                <TextField source="role" />
                <TextField source="secret" emptyText={EMPTY_TEXT} />
            </SimpleShowLayout>
        </Show>
    );
};
