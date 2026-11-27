import { render, screen } from '@testing-library/react';
import { AdminContext, Form, ResourceContextProvider, defaultI18nProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Input, type SettingRecordMeta } from './Input';

function renderInput(meta: SettingRecordMeta, value: unknown) {
    return render(
        <AdminContext i18nProvider={defaultI18nProvider}>
            <ResourceContextProvider value="settings">
                <Form defaultValues={{ value }}>
                    <Input meta={meta} />
                </Form>
            </ResourceContextProvider>
        </AdminContext>,
    );
}

describe('setting value input', () => {
    it('edits a URL as text', () => {
        renderInput({ type: 'url' }, 'https://example.com');

        expect(screen.getByRole('textbox', { name: 'Value' })).toHaveValue('https://example.com');
    });

    it('offers the choices of an enum', () => {
        renderInput(
            {
                type: 'enum',
                choices: [
                    { id: 'local', name: 'local' },
                    { id: 'openid', name: 'openid' },
                ],
            },
            'openid',
        );

        expect(screen.getByRole('radio', { name: 'local' })).not.toBeChecked();
        expect(screen.getByRole('radio', { name: 'openid' })).toBeChecked();
    });

    it('switches a boolean', () => {
        renderInput({ type: 'boolean' }, true);

        expect(screen.getByRole('switch', { name: 'Value' })).toBeChecked();
    });

    it('hides a password', () => {
        renderInput({ type: 'password' }, 'secret');

        expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'password');
    });

    it('edits a list of strings item by item', () => {
        renderInput({ type: 'string[]' }, ['en-US', 'ua-UA']);

        expect(screen.getAllByRole('textbox').map((input) => input.getAttribute('value'))).toEqual(['en-US', 'ua-UA']);
        expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('edits JSON in the code editor', () => {
        const { container } = renderInput({ type: 'json' }, { defaultSrc: ["'self'"] });

        expect(screen.getByText('CSP configuration JSON')).toBeInTheDocument();
        expect(container.querySelector('.ace_editor')).toBeInTheDocument();
    });

    it('edits any other value as text of several lines', () => {
        renderInput({ type: 'string' }, 'ILC');

        expect(screen.getByRole('textbox', { name: 'Value' })).toHaveValue('ILC');
        expect(screen.getByRole('textbox', { name: 'Value' }).tagName).toBe('TEXTAREA');
    });
});
