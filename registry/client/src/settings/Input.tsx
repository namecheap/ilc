import {
    ArrayInput,
    BooleanInput,
    PasswordInput,
    RadioButtonGroupInput,
    SimpleFormIterator,
    TextInput,
} from 'react-admin';

import { JsonField } from '../JsonField';
import * as validators from '../validators';
import { types, type SettingChoice, type SettingMeta } from './dataTransform';

/** The meta of a setting record: transformGet turns the choices of an enum into select choices */
export type SettingRecordMeta = Omit<SettingMeta, 'choices'> & { choices?: SettingChoice[] };

/**
 * The input of the setting value, picked by the type of the setting.
 */
export function Input({ meta }: { meta: SettingRecordMeta }) {
    switch (meta.type) {
        case types.url: {
            return <TextInput source="value" fullWidth validate={validators.url} />;
        }
        case types.enum: {
            return <RadioButtonGroupInput row={false} source="value" choices={meta.choices} />;
        }
        case types.boolean: {
            return <BooleanInput source="value" />;
        }
        case types.password: {
            return <PasswordInput source="value" fullWidth />;
        }
        case types.stringArray: {
            return (
                <ArrayInput source="value">
                    <SimpleFormIterator>
                        <TextInput source="" label={false} fullWidth />
                    </SimpleFormIterator>
                </ArrayInput>
            );
        }
        case types.json: {
            return <JsonField source="value" label="CSP configuration JSON" />;
        }
        default: {
            return <TextInput multiline source="value" fullWidth />;
        }
    }
}
