import { Edit, SaveButton, SimpleForm, Toolbar, useRecordContext } from 'react-admin';

import { Input } from './Input';
import { Title } from './Title';

function EditToolbar() {
    return (
        <Toolbar>
            <SaveButton />
        </Toolbar>
    );
}

function ValueInput() {
    const record = useRecordContext();

    return record?.meta ? <Input meta={record.meta} /> : null;
}

export function SettingEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <SimpleForm toolbar={<EditToolbar />}>
                <ValueInput />
            </SimpleForm>
        </Edit>
    );
}
