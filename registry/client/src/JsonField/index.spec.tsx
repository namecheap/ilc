import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AdminContext, Form, RecordContextProvider, defaultI18nProvider } from 'react-admin';
import { describe, expect, it, vi } from 'vitest';

import { JsonField, JsonFieldShow } from './index';

// A text area that holds the value as JSON text stands in for the editor, which has a spec of its own
vi.mock('./JsonEditor', () => ({
    JsonEditor({ mode, value, onChange }: { mode: string; value: unknown; onChange?: (value: unknown) => void }) {
        return (
            <textarea
                aria-label={`${mode} editor`}
                value={JSON.stringify(value)}
                onChange={(event) => onChange?.(JSON.parse(event.target.value))}
            />
        );
    },
}));

function renderInForm(input: ReactNode, onSubmit = vi.fn()) {
    render(
        <AdminContext i18nProvider={defaultI18nProvider}>
            <Form defaultValues={{ props: { a: 1 } }} onSubmit={onSubmit}>
                {input}
                <button type="submit">Save</button>
            </Form>
        </AdminContext>,
    );

    return onSubmit;
}

describe('JsonField', () => {
    it('edits a value of the form in the code editor', async () => {
        const onSubmit = renderInForm(<JsonField source="props" label="Properties" />);
        expect(screen.getByText('Properties')).toBeInTheDocument();
        expect(screen.getByLabelText('code editor')).toHaveValue('{"a":1}');

        fireEvent.change(screen.getByLabelText('code editor'), { target: { value: '{"a":2}' } });
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        // The form holds the value itself, not its text
        await waitFor(() => expect(onSubmit).toHaveBeenCalled());
        expect(onSubmit.mock.lastCall?.[0]).toEqual({ props: { a: 2 } });
    });

    it('explains the value with a helper text', () => {
        renderInForm(<JsonField source="props" label="Properties" helperText="Available in the browser" />);

        expect(screen.getByText('Available in the browser')).toBeInTheDocument();
    });

    it('shows why the value is not accepted', async () => {
        const onSubmit = renderInForm(
            <JsonField source="props" label="Properties" validate={() => 'Has to be an object'} />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Has to be an object')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});

describe('JsonFieldShow', () => {
    it('shows a value of the record as a read-only tree', () => {
        render(
            <RecordContextProvider value={{ id: 1, props: { a: 1 } }}>
                <JsonFieldShow source="props" label="Properties" />
            </RecordContextProvider>,
        );

        expect(screen.getByLabelText('view editor')).toHaveValue('{"a":1}');
    });

    it('shows nothing while the record loads', () => {
        render(<JsonFieldShow source="props" />);

        expect(screen.getByLabelText('view editor')).toHaveValue('');
    });
});
