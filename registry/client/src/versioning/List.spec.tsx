import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { apiError, filterOf, renderResource, stubApi, writes } from '../testUtils';

import { versioning } from './index';

const created_at = 1700000000000;
const changes = [
    {
        id: 3,
        entity_type: 'apps',
        entity_id: '@portal/navbar',
        data: JSON.stringify({ kind: 'primary', props: '{"publicPath":"/navbar/"}' }),
        data_after: JSON.stringify({ kind: 'essential', props: '{"publicPath":"/navbar/"}' }),
        created_by: 'root',
        created_at,
    },
    {
        id: 2,
        entity_type: 'routes',
        entity_id: '7',
        data: JSON.stringify({ route: '/news/*' }),
        data_after: null,
        created_by: 'root',
        created_at,
    },
    {
        id: 1,
        entity_type: 'shared_libs',
        entity_id: 'forms',
        data: null,
        data_after: JSON.stringify({ spaBundle: 'https://cdn.example.com/forms.js' }),
        created_by: 'ci',
        created_at,
    },
];

function stubHistory(routes: Record<string, unknown> = {}) {
    return stubApi({ '/api/v1/versioning': changes, ...routes });
}

async function findRow(entityId: string) {
    return within((await screen.findByText(entityId)).closest('tr')!);
}

async function revert(entityId: string) {
    await userEvent.click(await (await findRow(entityId)).findByRole('button', { name: 'Revert' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Confirm' }));
}

describe('VersioningList', () => {
    it('lists the changes with what was done, by whom and when', async () => {
        stubHistory();
        renderResource('versioning', versioning, '/versioning');

        const update = await findRow('@portal/navbar');
        expect(update.getByText('UPDATE')).toBeInTheDocument();
        expect(update.getByText('apps')).toBeInTheDocument();
        expect(update.getByText('root')).toBeInTheDocument();
        expect(update.getByText(new Date(created_at).toLocaleString())).toBeInTheDocument();
        expect((await findRow('7')).getByText('DELETE')).toBeInTheDocument();
        expect((await findRow('forms')).getByText('CREATE')).toBeInTheDocument();
    });

    it('shows what a change did when its row is expanded', async () => {
        stubHistory();
        const { container } = renderResource('versioning', versioning, '/versioning');

        await userEvent.click((await findRow('@portal/navbar')).getByRole('button', { name: 'Expand' }));

        // The JSON kept as text in a snapshot is shown as JSON
        await waitFor(() => expect(container).toHaveTextContent('"publicPath": "/navbar/"'));
        expect(container).toHaveTextContent('primary');
        expect(container).toHaveTextContent('essential');
    });

    it('shows the only snapshot of a record that was created or deleted', async () => {
        stubHistory();
        const { container } = renderResource('versioning', versioning, '/versioning');

        await userEvent.click((await findRow('7')).getByRole('button', { name: 'Expand' }));
        await waitFor(() => expect(container).toHaveTextContent('"route": "/news/*"'));

        await userEvent.click((await findRow('forms')).getByRole('button', { name: 'Expand' }));
        await waitFor(() => expect(container).toHaveTextContent('"spaBundle": "https://cdn.example.com/forms.js"'));
    });

    it('filters by who made the changes', async () => {
        const requests = stubHistory();
        renderResource('versioning', versioning, '/versioning');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Created by' }), 'ci');

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ created_by: 'ci' }));
    });

    it('reverts a change once it is confirmed', async () => {
        const requests = stubHistory({ 'POST /api/v1/versioning/3/revert': { status: 'ok' } });
        renderResource('versioning', versioning, '/versioning');

        await userEvent.click(await (await findRow('@portal/navbar')).findByRole('button', { name: 'Revert' }));
        expect(await screen.findByText('Are you sure that you want to revert change with ID "3"?')).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);
        await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        expect(await screen.findByText('Change was successfully reverted')).toBeInTheDocument();
        expect(writes(requests)).toMatchObject([{ method: 'POST', path: '/api/v1/versioning/3/revert' }]);
        // The list is read again, it has the revert as a new change
        await waitFor(() =>
            expect(requests.filter((request) => request.path === '/api/v1/versioning').length).toBeGreaterThan(1),
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('reverts nothing when the confirmation is cancelled', async () => {
        const requests = stubHistory();
        renderResource('versioning', versioning, '/versioning');

        await userEvent.click(await (await findRow('@portal/navbar')).findByRole('button', { name: 'Revert' }));
        await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(writes(requests)).toHaveLength(0);
    });

    it('tells why the API refuses to revert a change', async () => {
        stubHistory({
            'POST /api/v1/versioning/3/revert': apiError(400, { reason: 'The entity was changed since' }),
        });
        renderResource('versioning', versioning, '/versioning');

        await revert('@portal/navbar');

        expect(await screen.findByText('The entity was changed since')).toBeInTheDocument();
    });

    it('does not show the details of a server failure', async () => {
        stubHistory({ 'POST /api/v1/versioning/3/revert': apiError(500, { reason: 'connection refused' }) });
        renderResource('versioning', versioning, '/versioning');

        await revert('@portal/navbar');

        expect(await screen.findByText('Oops! Something went wrong.')).toBeInTheDocument();
        expect(screen.queryByText('connection refused')).not.toBeInTheDocument();
    });

    it('does not let a read-only user revert', async () => {
        stubHistory();
        renderResource('versioning', versioning, '/versioning', { role: 'readonly' });

        await findRow('@portal/navbar');
        await expect.poll(() => screen.queryByRole('button', { name: 'Revert' })).not.toBeInTheDocument();
    });
});
