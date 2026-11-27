import { Show, SimpleShowLayout, TextField } from 'react-admin';

import { ShowTopToolbar } from '../components';
import { EMPTY_TEXT } from '../constants';
import { Title } from './Title';

export function AuthEntityShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <SimpleShowLayout>
                <TextField source="identifier" />
                <TextField source="provider" />
                <TextField source="role" />
                <TextField source="secret" emptyText={EMPTY_TEXT} />
            </SimpleShowLayout>
        </Show>
    );
}
