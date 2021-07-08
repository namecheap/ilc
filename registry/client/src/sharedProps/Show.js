import React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { JsonFieldShow } from '../JsonField';
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleShowLayout initialValues={{ props: {} }} {...props} toolbar={null}>
                <TextField source="name" />
                <JsonFieldShow
                    source="props"
                    label="Properties that will be passed to applications"
                />
                <JsonFieldShow
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                />
            </SimpleShowLayout>
        </Show>
    );
};
