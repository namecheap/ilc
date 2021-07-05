import React from 'react';
import {
    Show,
    SimpleForm,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from '../JsonField/index';
import Title from './Title';
import { JSON_FIELD_VIEW_MODE } from '../constants';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleForm initialValues={{ props: {} }} {...props} toolbar={null}>
                <TextField source="name" />
                <JsonField
                    source="props"
                    label="Properties that will be passed to applications"
                    mode={JSON_FIELD_VIEW_MODE}
                />
                <JsonField
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                    mode={JSON_FIELD_VIEW_MODE}
                />
            </SimpleForm>
        </Show>
    );
};
