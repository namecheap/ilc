import _ from 'lodash';

import {SettingKeys, TrailingSlashValues} from '../server/settings/interfaces';
import {request, expect, requestWithAuth} from './common';

const example = {
    apps: Object.freeze({
        name: '@portal/ncTestAppName',
        spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
        configSelector: ['ncTestSharedPropsName'],
        ssr: {
            src: "http://127.0.0.1:1234/fragment",
            timeout: 1000,
        },
        kind: 'primary',
    }),
    appRoutes: Object.freeze({
        orderPos: 122,
        route: '/ncTestRoute/*',
        next: false,
        slots: {
            ncTestRouteSlotName: {
                appName: '@portal/ncTestAppName',
                props: { ncTestProp: 1 },
                kind: 'regular',
            },
        },
        meta: {
            first: null,
            second: 3000,
            third: 'value',
        },
    }),
    templates: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContent'
    }),
    sharedProps: Object.freeze({
        name: 'ncTestSharedPropsName',
        props: {
            ncTestSharedPropsPropName: 'ncTestSharedPropsPropValue',
        }
    }),
};

describe('Tests /api/v1/config', () => {
    describe('Read', () => {
        it('should successfully return config', async () => {
            await request.post('/api/v1/app/').send(example.apps).expect(200);
            await request.post('/api/v1/template/').send(example.templates).expect(200);
            const responseRoute = await request.post('/api/v1/route/').send(example.appRoutes).expect(200);
            await request.post('/api/v1/shared_props/').send(example.sharedProps).expect(200);

            const response = await request.get('/api/v1/config')
            .expect(200);

            expect(response.text).to.be.a('string');
            expect(response.body).to.be.an('object');

            expect(response.body.apps).to.be.an('object');
            expect(response.body.templates).to.be.an('array');
            expect(response.body.routes).to.be.an('array');
            expect(response.body.specialRoutes).to.be.an('object');

            expect(response.body.routes).to.deep.include({
                routeId: responseRoute.body.id,
                ..._.pick(example.appRoutes, ['route', 'next', 'slots', 'meta'])
            });

            expect(response.body.apps[example.apps.name])
            .deep.equal(
                _.omit(
                    {
                        ...example.apps,
                        props: example.sharedProps.props
                    },
                    ['name', 'configSelector']
                )
            );

            expect(response.body.templates).to.include(example.templates.name);
            expect(response.body.settings).to.deep.equal({
                [SettingKeys.TrailingSlash]: TrailingSlashValues.DoNothing,
                [SettingKeys.AmdDefineCompatibilityMode]: false,
                globalSpinner: {
                    enabled: true
                },
                i18n: {
                    default: {
                        currency: 'USD',
                        locale: 'en-US',
                    },
                    enabled: true,
                    supported: {
                        currency: ['USD', 'UAH'],
                        locale: ['en-US', 'ua-UA']
                    },
                    routingStrategy: 'prefix_except_default',
                }

        });

            await request.delete('/api/v1/route/' + responseRoute.body.id).expect(204);
            await request.delete('/api/v1/template/' + example.templates.name).expect(204);
            await request.delete('/api/v1/app/' + encodeURIComponent(example.apps.name)).expect(204);
            await request.delete('/api/v1/shared_props/' + example.sharedProps.name).expect(204);
        })
    });

    describe('Authentication / Authorization', () => {
        it('should be accessible w/o authentication', async () => {
            await requestWithAuth.get('/api/v1/config')
                .expect(200);
        });
    });
});
