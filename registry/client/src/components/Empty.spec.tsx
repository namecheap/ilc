import { screen } from '@testing-library/react';
import { List } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { Empty } from './Empty';

function EmptyList() {
    return (
        <List empty={<Empty />}>
            <span>records</span>
        </List>
    );
}

const pages = { list: EmptyList, create: () => null };

describe('Empty', () => {
    it('invites an admin to add the first record', async () => {
        stubApi({ '/api/v1/shared_props': [] });
        renderResource('shared_props', pages, '/shared_props');

        expect(await screen.findByText('No Shared props yet.')).toBeInTheDocument();
        expect(screen.getByText('Do you want to add one?')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/shared_props/create');
        expect(screen.queryByText(/permissions/)).not.toBeInTheDocument();
    });

    it('tells a read-only user why there is nothing to add', async () => {
        stubApi({ '/api/v1/shared_props': [] });
        renderResource('shared_props', pages, '/shared_props', { role: 'readonly' });

        expect(await screen.findByText('No Shared props yet.')).toBeInTheDocument();
        expect(
            screen.getByText('You have "readonly" permissions, so you can\'t create new items here.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Do you want to add one?')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
    });
});
