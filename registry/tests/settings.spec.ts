import chai from 'chai';
import urlJoin from 'url-join';

import {request, requestWithAuth} from './common';
import {SettingKeys, TrailingSlashValues} from '../server/settings/interfaces';

const url = '/api/v1/settings';

describe(url, () => {
    describe('when a user trying to get information', () => {
        it('should return settings', async () => {
            const response = await request.get('/api/v1/settings').expect(200);

            chai.expect(response.body).to.have.length(10);
            chai.expect(response.body).to.deep.include({key: SettingKeys.TrailingSlash, value: TrailingSlashValues.DoNothing, secured: 0});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdClientSecret, secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdRequestedScopes, value: 'openid', secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AmdDefineCompatibilityMode, value: false, secured: 0});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdIdentifierClaimName, value: 'unique_name', secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdResponseMode, value: 'query', secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.BaseUrl, value: 'http://localhost:4001/', secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdDiscoveryUrl, secured: 1});
            chai.expect(response.body).to.deep.include({key: SettingKeys.AuthOpenIdEnabled, value: false, secured: 1});
        });

        it('should return a setting', async () => {
            const response = await request.get(urlJoin('/api/v1/settings', SettingKeys.AmdDefineCompatibilityMode)).expect(200);

            chai.expect(response.body).to.deep.equal({
                key: SettingKeys.AmdDefineCompatibilityMode,
                value: false,
                secured: 0,
            });
        });

        it('should deny access when a user is not authorized', async () => {
            await requestWithAuth.get(url).expect(401);
            await requestWithAuth.get(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).expect(401);
        });
    });

    describe('when a user trying to update information', () => {
        it('should update a setting', async () => {
            try {
                let response = await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://spec.com',
                    secured: false,
                }).expect(200);

                chai.expect(response.body).to.deep.equal({
                    key: SettingKeys.BaseUrl,
                    value: 'http://spec.com',
                    secured: 1,
                });
            } finally {
                await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://localhost:4001/',
                    secured: true,
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.AmdDefineCompatibilityMode} if value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                    key: SettingKeys.AmdDefineCompatibilityMode,
                    value: 'true',
                    secured: true,
                }).expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                    key: SettingKeys.AmdDefineCompatibilityMode,
                    value: false,
                    secured: false,
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.TrailingSlash} if value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.TrailingSlash)).send({
                    key: SettingKeys.TrailingSlash,
                    value: 'something',
                    secured: false,
                }).expect(422, '"value" must be one of [doNothing, redirectToBaseUrl, redirectToBaseUrlWithTrailingSlash]');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.TrailingSlash)).send({
                    key: SettingKeys.TrailingSlash,
                    value: TrailingSlashValues.DoNothing,
                    secured: false,
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.AuthOpenIdEnabled} if value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.AuthOpenIdEnabled)).send({
                    key: SettingKeys.AuthOpenIdEnabled,
                    value: 'true',
                    secured: false,
                }).expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.AuthOpenIdEnabled)).send({
                    key: SettingKeys.AuthOpenIdEnabled,
                    value: false,
                    secured: true,
                }).expect(200);
            }
        });

        it('should deny access when a user is not authorized', async () => {
            await requestWithAuth.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                value: true,
            }).expect(401);
        });
    });
});
