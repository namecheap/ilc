import { Show, SimpleShowLayout, TextField } from 'react-admin';

import { ShowTopToolbar } from '../components';
import { JsonFieldShow } from '../JsonField';
import { Title } from './Title';

export function SharedPropsShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <SimpleShowLayout>
                <TextField source="name" />
                <JsonFieldShow source="props" label="Properties that will be passed to applications" />
                <JsonFieldShow
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                />
            </SimpleShowLayout>
        </Show>
    );
}
