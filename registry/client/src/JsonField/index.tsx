import { FormControl, FormHelperText, FormLabel } from '@mui/material';
import type { ReactNode } from 'react';
import { FieldTitle, InputHelperText, useInput, useRecordContext, type InputProps } from 'react-admin';

import { JsonEditor } from './JsonEditor';

/**
 * Input that edits a JSON value in a code editor.
 */
export function JsonField({ label, helperText, ...props }: InputProps & { helperText?: ReactNode }) {
    const {
        field,
        fieldState: { error, invalid },
        isRequired,
    } = useInput(props);

    return (
        <FormControl fullWidth error={invalid} margin="dense">
            <FormLabel>
                <FieldTitle label={label} source={props.source} resource={props.resource} isRequired={isRequired} />
            </FormLabel>
            <JsonEditor mode="code" value={field.value} onChange={field.onChange} />
            {/* Rendered even when empty, as react-admin inputs do, so the gap to the next input is the same */}
            <FormHelperText>
                <InputHelperText error={error?.message} helperText={helperText} />
            </FormHelperText>
        </FormControl>
    );
}

/**
 * Field that shows a JSON value of the current record as a read-only tree.
 * `label` is read by the show layout, which renders it above the field.
 */
export function JsonFieldShow({ source }: { source: string; label?: string }) {
    const record = useRecordContext();

    return <JsonEditor mode="view" value={record?.[source]} />;
}
