import chai from 'chai';
import urlJoin from 'url-join';

import { request, requestWithAuth } from './common';
import { SettingKeys, TrailingSlashValues, Scope, SettingTypes } from '../server/settings/interfaces';
import supertest from 'supertest';

const url = '/api/v1/settings';

const cspValue = JSON.stringify({
    defaultSrc: ['https://test.com'],
    reportUri: 'a/b',
});

describe(url, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;
    let createDomain: () => Promise<{ getResponse: () => { id: any }; destory: () => Promise<void> }>;
    let createConfigRequest: (payload: Object) => supertest.Test;
    let deleteConfigRequest: (id: number) => supertest.Test;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
        createDomain = async () => {
            const template500Payload = {
                url: '/api/v1/template/',
                payload: {
                    name: 'ncTest500TemplateNameForSettings',
                    content: 'ncTest500TemplateNameForSettings',
                },
            };

            await req.post(template500Payload.url).send(template500Payload.payload);

            const payload = {
                url: '/api/v1/router_domains/',
                correct: {
                    domainName: 'test-settings.com',
                    template500: template500Payload.payload.name,
                },
            };

            const domainResponse = await req.post(payload.url).send(payload.correct);

            const domainId = domainResponse.body.id;

            return {
                getResponse: () => ({ id: domainId }),
                destory: async () => {
                    await req.delete(`${payload.url}${domainId}`);
                    await req.delete(template500Payload.url + template500Payload.payload.name);
                },
            };
        };
        createConfigRequest = (payload: Object): supertest.Test => {
            return req.post(url).send(payload);
        };
        deleteConfigRequest = (id: number): supertest.Test => {
            return req.delete(urlJoin(url, id.toString())).send();
        };
    });

    describe('when a user trying to get information', () => {
        it('should return settings and exclude values from secret records', async () => {
            const response = await req.get('/api/v1/settings').expect(200);

            const returnedKVs = (response.body as any[]).reduce((acc, v) => {
                acc[v.key] = v.value;
                return acc;
            }, {});
            chai.expect(returnedKVs[SettingKeys.AuthOpenIdClientSecret]).to.be.undefined;

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
            const response = await req.get(urlJoin('/api/v1/settings', SettingKeys.AuthOpenIdClientSecret)).expect(200);

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
            const response = await req.get(urlJoin('/api/v1/settings', SettingKeys.TrailingSlash)).expect(200);

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
            await reqWithAuth.get(url).expect(401);
            await reqWithAuth.get(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode)).expect(401);
        });

        it('should return settings and exclude values from secret records filtered by domain', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };
            const configResponse = await createConfigRequest(uniqueEntityPayload).expect(200);
            const id = configResponse.body.id;

            try {
                const queryFilter = encodeURIComponent(JSON.stringify({ enforceDomain: domainId }));
                const response = await req.get(`${url}?filter=${queryFilter}`).expect(200);
            } finally {
                await deleteConfigRequest(id).expect(204);
                await domainHelper.destory();
            }
        });

        it('should return settings by domain name in case domain name is not root', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };
            const configResponse = await createConfigRequest(uniqueEntityPayload).expect(200);
            const id = configResponse.body.id;

            try {
                const queryFilter = encodeURIComponent(JSON.stringify({ domainName: 'test-settings.com' }));
                const response = await req.get(`${url}?filter=${queryFilter}`).expect(200);

                chai.expect(response.body).to.deep.include({
                    key: SettingKeys.CspConfig,
                    value: JSON.parse(cspValue),
                    domainValue: JSON.parse(cspValue),
                    scope: Scope.Ilc,
                    secret: false,
                    meta: {
                        type: SettingTypes.JSON,
                    },
                    domainId,
                });
            } finally {
                await deleteConfigRequest(id).expect(204);
                await domainHelper.destory();
            }
        });

        it('should return default setting value if setting supports domain override but not overridden for passed domain', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };

            try {
                const queryFilter = encodeURIComponent(JSON.stringify({ domainName: 'test-settings.com' }));
                const response = await req.get(`${url}?filter=${queryFilter}`).expect(200);

                const defaultCsp = {
                    key: SettingKeys.CspConfig,
                    scope: Scope.Ilc,
                    secret: false,
                    meta: {
                        type: SettingTypes.JSON,
                    },
                };

                chai.expect(response.body).to.deep.include(defaultCsp);
            } finally {
                await domainHelper.destory();
            }
        });

        it('should return settings by domain name in case domain name is root', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };
            const configResponse = await createConfigRequest(uniqueEntityPayload).expect(200);
            const id = configResponse.body.id;

            try {
                const queryFilter = encodeURIComponent(JSON.stringify({ domainName: 'test-settings-notReal.com' }));
                const response = await req.get(`${url}?filter=${queryFilter}`).expect(200);

                chai.expect(response.body).to.deep.include({
                    key: 'cspConfig',
                    scope: 'ilc',
                    secret: false,
                    meta: {
                        type: SettingTypes.JSON,
                    },
                });
            } finally {
                await deleteConfigRequest(id).expect(204);
                await domainHelper.destory();
            }
        });
    });

    describe('when a user tries to update information', () => {
        it('should update a setting', async () => {
            try {
                let response = await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'http://spec.com',
                    })
                    .expect(200);

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
                await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'http://localhost:4001/',
                    })
                    .expect(200);
            }
        });

        it('should not update a setting if would be provided extra props despite key and value props', async () => {
            try {
                let response = await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'http://spec.com',
                        default: 'http://localhost:4001/',
                        scope: Scope.Registry,
                        secret: false,
                        meta: {
                            type: SettingTypes.Url,
                        },
                    })
                    .expect(
                        422,
                        '"default" is not allowed\n' +
                            '"scope" is not allowed\n' +
                            '"secret" is not allowed\n' +
                            '"meta" is not allowed',
                    );

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'http://localhost:4001/',
                    })
                    .expect(200);
            }
        });

        it('should update a setting that is secret and return a record without the value', async () => {
            try {
                let response = await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdClientSecret))
                    .send({
                        key: SettingKeys.AuthOpenIdClientSecret,
                        value: '********',
                    })
                    .expect(200);

                chai.expect(response.body).to.deep.equal({
                    key: SettingKeys.AuthOpenIdClientSecret,
                    scope: Scope.Registry,
                    secret: true,
                    meta: {
                        type: SettingTypes.Password,
                    },
                });
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdClientSecret))
                    .send({
                        key: SettingKeys.AuthOpenIdClientSecret,
                        value: '',
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.BaseUrl} if the value is wrong`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'ftp://spec:3000/',
                    })
                    .expect(422, '"value" must be a valid uri with a scheme matching the https? pattern');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.BaseUrl))
                    .send({
                        key: SettingKeys.BaseUrl,
                        value: 'http://localhost:4001/',
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.AuthOpenIdDiscoveryUrl} if the value is wrong`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdDiscoveryUrl))
                    .send({
                        key: SettingKeys.AuthOpenIdDiscoveryUrl,
                        value: 'www.spec:3000',
                    })
                    .expect(422, '"value" must be a valid uri with a scheme matching the https? pattern');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdDiscoveryUrl))
                    .send({
                        key: SettingKeys.AuthOpenIdDiscoveryUrl,
                        value: '',
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.AmdDefineCompatibilityMode} if the value is not valid`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode))
                    .send({
                        key: SettingKeys.AmdDefineCompatibilityMode,
                        value: 'true',
                    })
                    .expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode))
                    .send({
                        key: SettingKeys.AmdDefineCompatibilityMode,
                        value: false,
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.TrailingSlash} if the value is not valid`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.TrailingSlash))
                    .send({
                        key: SettingKeys.TrailingSlash,
                        value: 'something',
                    })
                    .expect(
                        422,
                        '"value" must be one of [doNothing, redirectToNonTrailingSlash, redirectToTrailingSlash]',
                    );

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.TrailingSlash))
                    .send({
                        key: SettingKeys.TrailingSlash,
                        value: TrailingSlashValues.DoNothing,
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.AuthOpenIdEnabled} if the value is not valid`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdEnabled))
                    .send({
                        key: SettingKeys.AuthOpenIdEnabled,
                        value: 'true',
                    })
                    .expect(422, '"value" must be a boolean');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.AuthOpenIdEnabled))
                    .send({
                        key: SettingKeys.AuthOpenIdEnabled,
                        value: false,
                    })
                    .expect(200);
            }
        });

        it(`should not update ${SettingKeys.CspConfig} if the value is not valid`, async () => {
            try {
                const response = await req
                    .put(urlJoin(url, SettingKeys.CspConfig))
                    .send({
                        key: SettingKeys.CspConfig,
                        value: 'true',
                    })
                    .expect(422, '"value" contains an invalid value');

                chai.expect(response.body).to.deep.equal({});
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.CspConfig))
                    .send({
                        key: SettingKeys.CspConfig,
                        value: null,
                    })
                    .expect(200);
            }
        });

        it(`should update ${SettingKeys.CspConfig} if the value is valid`, async () => {
            try {
                await req
                    .put(urlJoin(url, SettingKeys.CspConfig))
                    .send({
                        key: SettingKeys.CspConfig,
                        value: JSON.stringify({
                            defaultSrc: ['https://test.com'],
                            reportUri: 'a/b',
                        }),
                    })
                    .expect(200);
            } finally {
                await req
                    .put(urlJoin(url, SettingKeys.CspConfig))
                    .send({
                        key: SettingKeys.CspConfig,
                        value: null,
                    })
                    .expect(200);
            }
        });

        it('should deny access when a user is not authorized', async () => {
            await reqWithAuth
                .put(urlJoin(url, SettingKeys.AmdDefineCompatibilityMode))
                .send({
                    key: SettingKeys.AmdDefineCompatibilityMode,
                    value: true,
                })
                .expect(401);
        });
    });

    describe('when a user tries to create settings', () => {
        it('should create a new setting', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;

            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };

            try {
                const response = await createConfigRequest(uniqueEntityPayload).expect(200);
                chai.expect(response.body).to.deep.equal({
                    id: response.body.id,
                    ...uniqueEntityPayload,
                    ...{ value: cspValue },
                });

                const id = response.body.id;
                await deleteConfigRequest(id).expect(204);
            } finally {
                await domainHelper.destory();
            }
        });

        it('should not create duplicated config for the same domain', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };

            try {
                const response = await createConfigRequest(uniqueEntityPayload).expect(200);
                const id = response.body.id;
                await createConfigRequest(uniqueEntityPayload).expect(500);
                await deleteConfigRequest(id).expect(204);
            } finally {
                await domainHelper.destory();
            }
        });
        it('should not create not allowed config for domain', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.BaseUrl,
                value: 'https://1.com',
            };

            try {
                await createConfigRequest(uniqueEntityPayload).expect(
                    422,
                    `Setting key ${SettingKeys.BaseUrl} is not allowed for domains`,
                );
            } finally {
                await domainHelper.destory();
            }
        });
        it('should not create not allows config for non-existant domain', async () => {
            const uniqueEntityPayload = {
                domainId: 999999,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };
            await createConfigRequest(uniqueEntityPayload).expect(422, 'Domain with id 999999 does not exist');
        });
        it('should not create not allows config with non-valid value', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: 'NotCorrectValue',
            };

            try {
                await createConfigRequest(uniqueEntityPayload).expect(422);
            } finally {
                await domainHelper.destory();
            }
        });
    });

    describe('when a user tries to delete settings', () => {
        it('should delete domain settings', async () => {
            const domainHelper = await createDomain();
            const domainId = domainHelper.getResponse().id;
            const uniqueEntityPayload = {
                domainId,
                key: SettingKeys.CspConfig,
                value: cspValue,
            };

            try {
                const response = await createConfigRequest(uniqueEntityPayload).expect(200);
                const id = response.body.id;
                chai.expect(response.body).to.deep.equal({
                    id,
                    ...uniqueEntityPayload,
                    ...{ value: cspValue },
                });

                await deleteConfigRequest(id).expect(204);
            } finally {
                await domainHelper.destory();
            }
        });
    });
});
