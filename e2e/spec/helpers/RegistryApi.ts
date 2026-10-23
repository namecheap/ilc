import assert from 'node:assert/strict';

import { helper as Helper } from 'codeceptjs';

import { registryApiToken, registryUrl } from './registryEnv';

type RegistryRecord = Record<string, unknown>;

type Cleanup = () => Promise<void>;

const authorization = `Bearer ${Buffer.from(registryApiToken.id).toString('base64')}:${Buffer.from(registryApiToken.secret).toString('base64')}`;

function resourceUrl(resource: string, id?: string | number) {
    const base = `${registryUrl}/api/v1/${resource}`;
    return id === undefined ? base : `${base}/${encodeURIComponent(id)}`;
}

async function request(method: string, url: string, body?: unknown) {
    const response = await fetch(url, {
        method,
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const isJson = response.headers.get('content-type')?.includes('application/json');

    return { status: response.status, body: isJson ? JSON.parse(text) : undefined, text };
}

async function putSetting(key: string, value: unknown) {
    const { status, text } = await request('PUT', resourceUrl('settings', key), { key, value });
    if (status !== 200) {
        throw new Error(`Failed to set setting "${key}": ${status} ${text}`);
    }
}

function matches(record: RegistryRecord, match: RegistryRecord) {
    return Object.entries(match).every(([key, value]) => record[key] === value);
}

/**
 * Prepares and cleans up Registry data over its API, so that admin UI scenarios
 * start from a known state and leave nothing behind for the ILC scenarios.
 */
class RegistryApi extends Helper {
    private cleanups: Cleanup[] = [];

    /**
     * Creates a record and deletes it after the test. Returns the created record.
     */
    async haveRegistryRecord(resource: string, data: RegistryRecord, idField = 'name') {
        const { status, body, text } = await request('POST', resourceUrl(resource), data);
        if (status !== 200) {
            throw new Error(`Failed to create ${resource}: ${status} ${text}`);
        }

        this.deleteAfterTest(resource, { [idField]: body[idField] }, idField);

        return body as RegistryRecord;
    }

    /**
     * Deletes the records matching `match` after the test, e.g. the ones a scenario creates through the UI.
     */
    async deleteRegistryRecordsAfterTest(resource: string, match: RegistryRecord, idField = 'name') {
        this.deleteAfterTest(resource, match, idField);
    }

    /**
     * Puts the current value of a root setting back after the test.
     */
    async restoreRegistrySettingAfterTest(key: string) {
        const { body } = await request('GET', resourceUrl('settings', key));
        // The API omits empty values, and an empty string is how a setting is stored as unset
        const value = body.value ?? '';

        this.cleanups.push(async () => {
            await putSetting(key, value);
        });
    }

    /**
     * Sets a root setting for the test and puts its current value back afterwards.
     */
    async haveRegistrySetting(key: string, value: unknown) {
        await this.restoreRegistrySettingAfterTest(key);
        await putSetting(key, value);
    }

    async grabRegistryRecord(resource: string, id: string | number) {
        const { body } = await request('GET', resourceUrl(resource, id));
        return body as RegistryRecord;
    }

    async dontSeeRegistryRecord(resource: string, id: string | number) {
        const { status } = await request('GET', resourceUrl(resource, id));
        assert.equal(status, 404, `Expected ${resource} "${id}" to be deleted, got status ${status}`);
    }

    async _after() {
        const cleanups = this.cleanups.reverse();
        this.cleanups = [];

        // Runs every cleanup even if one fails, so that a single failure doesn't leave the other records behind
        const errors: string[] = [];
        for (const cleanup of cleanups) {
            await cleanup().catch((error: Error) => errors.push(error.message));
        }

        if (errors.length) {
            throw new Error(`Failed to clean up Registry records:\n${errors.join('\n')}`);
        }
    }

    private deleteAfterTest(resource: string, match: RegistryRecord, idField: string) {
        this.cleanups.push(async () => {
            const { body: records } = await request('GET', resourceUrl(resource));

            for (const record of (records as RegistryRecord[]).filter((record) => matches(record, match))) {
                const id = record[idField] as string | number;
                const { status, text } = await request('DELETE', resourceUrl(resource, id));

                if (status !== 204 && status !== 404) {
                    throw new Error(`Failed to delete ${resource} "${id}": ${status} ${text}`);
                }
            }
        });
    }
}

// CodeceptJS instantiates a custom helper from the module's default export
export default RegistryApi;
