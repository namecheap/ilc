import chai from 'chai';
import urlJoin from 'url-join';

import {request, requestWithAuth} from './common';
import {SettingKeys, TrailingSlashValues, Scope, SettingTypes} from '../server/settings/interfaces';

const url = '/api/v1/settings';

describe(url, () => {
    describe('when a user trying to get information', () => {
        it('should return settings and exclude values from secret records', async () => {
            const response = await request.get('/api/v1/settings').expect(200);

            chai.expect(response.body).to.have.length(10);
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.TrailingSlash,
                value: TrailingSlashValues.DoNothing,
                default: TrailingSlashValues.DoNothing,
                scope: Scope.Ilc,
                secret: false,
                meta: {
                    type: SettingTypes.Enum,
                    choices: [
                        TrailingSlashValues.DoNothing,
                        TrailingSlashValues.redirectToNonTrailingSlash,
                        TrailingSlashValues.redirectToTrailingSlash,
                    ],
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.BaseUrl,
                value: 'http://localhost:4001/',
                default: 'http://localhost:4001/',
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.Url,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AmdDefineCompatibilityMode,
                value: false,
                default: false,
                scope: Scope.Ilc,
                secret: false,
                meta: {
                    type: SettingTypes.Boolean,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdEnabled,
                value: false,
                default: false,
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.Boolean,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdDiscoveryUrl,
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.Url,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdClientId,
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.String,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdClientSecret,
                scope: Scope.Registry,
                secret: true,
                meta: {
                    type: SettingTypes.Password,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdResponseMode,
                value: 'query',
                default: 'query',
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.String,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdIdentifierClaimName,
                value: 'unique_name',
                default: 'unique_name',
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.String,
                },
            });
            chai.expect(response.body).to.deep.include({
                key: SettingKeys.AuthOpenIdRequestedScopes,
                value: 'openid',
                default: 'openid',
                scope: Scope.Registry,
                secret: false,
                meta: {
                    type: SettingTypes.String,
                },
            });
        });

        it('should return a setting and exclude a value from a secret record', async () => {
            const response = await request.get(urlJoin('/api/v1/settings', SettingKeys.AuthOpenIdClientSecret)).expect(200);

            chai.expect(response.body).to.deep.equal({
                key: SettingKeys.AuthOpenIdClientSecret,
                scope: Scope.Registry,
                secret: true,
                meta: {
                    type: SettingTypes.Password,
                },
            });
        });

        it('should return a setting', async () => {
            const response = await request.get(urlJoin('/api/v1/settings', SettingKeys.TrailingSlash)).expect(200);

            chai.expect(response.body).to.deep.equal({
                key: SettingKeys.TrailingSlash,
                value: TrailingSlashValues.DoNothing,
                default: TrailingSlashValues.DoNothing,
                scope: Scope.Ilc,
                secret: false,
                meta: {
                    type: SettingTypes.Enum,
                    choices: [
                        TrailingSlashValues.DoNothing,
                        TrailingSlashValues.redirectToNonTrailingSlash,
                        TrailingSlashValues.redirectToTrailingSlash,
                    ],
                },
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
                }).expect(200);

                chai.expect(response.body).to.deep.equal({
                    key: SettingKeys.BaseUrl,
                    value: 'http://spec.com',
                    default: 'http://localhost:4001/',
                    scope: Scope.Registry,
                    secret: false,
                    meta: {
                        type: SettingTypes.Url,
                    },
                });
            } finally {
                await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://localhost:4001/',
                }).expect(200);
            }
        });

        it('should not update a setting if would be provided extra props despite key and value props', async () => {
            try {
                let response = await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://spec.com',
                    default: 'http://localhost:4001/',
                    scope: Scope.Registry,
                    secret: false,
                    meta: {
                        type: SettingTypes.Url,
                    },
                }).expect(
                    422,
                    '"default" is not allowed\n' +
                    '"scope" is not allowed\n' +
                    '"secret" is not allowed\n' +
                    '"meta" is not allowed'
                );

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://localhost:4001/',
                }).expect(200);
            }
        });

        it('should update a setting that is secret and return a record without the value', async () => {
            try {
                let response = await request.put(urlJoin(url, SettingKeys.AuthOpenIdClientSecret)).send({
                    key: SettingKeys.AuthOpenIdClientSecret,
                    value: '********',
                }).expect(200);

                chai.expect(response.body).to.deep.equal({
                    key: SettingKeys.AuthOpenIdClientSecret,
                    scope: Scope.Registry,
                    secret: true,
                    meta: {
                        type: SettingTypes.Password,
                    },
                });
            } finally {
                await request.put(urlJoin(url, SettingKeys.AuthOpenIdClientSecret)).send({
                    key: SettingKeys.AuthOpenIdClientSecret,
                    value: '',
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.BaseUrl} if the value is wrong`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'ftp://spec:3000/',
                }).expect(422, '"value" must be a valid uri with a scheme matching the https? pattern');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.BaseUrl)).send({
                    key: SettingKeys.BaseUrl,
                    value: 'http://localhost:4001/',
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.AuthOpenIdDiscoveryUrl} if the value is wrong`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.AuthOpenIdDiscoveryUrl)).send({
                    key: SettingKeys.AuthOpenIdDiscoveryUrl,
                    value: 'www.spec:3000',
                }).expect(422, '"value" must be a valid uri with a scheme matching the https? pattern');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.AuthOpenIdDiscoveryUrl)).send({
                    key: SettingKeys.AuthOpenIdDiscoveryUrl,
                    value: '',
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.AmdDefineCompatibilityMode} if the value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                    key: SettingKeys.AmdDefineCompatibilityMode,
                    value: 'true',
                }).expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                    key: SettingKeys.AmdDefineCompatibilityMode,
                    value: false,
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.TrailingSlash} if the value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.TrailingSlash)).send({
                    key: SettingKeys.TrailingSlash,
                    value: 'something',
                }).expect(422, '"value" must be one of [doNothing, redirectToNonTrailingSlash, redirectToTrailingSlash]');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.TrailingSlash)).send({
                    key: SettingKeys.TrailingSlash,
                    value: TrailingSlashValues.DoNothing,
                }).expect(200);
            }
        });

        it(`should not update ${SettingKeys.AuthOpenIdEnabled} if the value is not valid`, async () => {
            try {
                const response = await request.put(urlJoin(url, SettingKeys.AuthOpenIdEnabled)).send({
                    key: SettingKeys.AuthOpenIdEnabled,
                    value: 'true',
                }).expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await request.put(urlJoin(url, SettingKeys.AuthOpenIdEnabled)).send({
                    key: SettingKeys.AuthOpenIdEnabled,
                    value: false,
                }).expect(200);
            }
        });

        it('should deny access when a user is not authorized', async () => {
            await requestWithAuth.put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).send({
                key: SettingKeys.AmdDefineCompatibilityMode,
                value: true,
            }).expect(401);
        });
    });
});
