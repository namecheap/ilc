import { request, expect } from './common';
import _ from 'lodash';

const example = {
    apps: Object.freeze({
        name: '@portal/ncTestAppName',
        spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
        ssr: {
            src: "http://127.0.0.1:1234/fragment",
            timeout: 1000,
            primary: true
        },
        assetsDiscoveryUrl: 'http://127.0.0.1:1234/_spa/dev/assets-discovery',
    }),
    appRoutes: Object.freeze({
        orderPos: 122,
        route: '/ncTestRoute/*',
        next: false,
        slots: {
            ncTestRouteSlotName: {
                appName: '@portal/ncTestAppName',
                props: { ncTestProp: 1 }
            },
        }
    }),
    templates: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContent'
    }),
};

describe('Tests /api/v1/config', () => {
    describe('Read', () => {
        it('should successfully return config', async () => {
            await request.post('/api/v1/app/').send(example.apps).expect(200);
            await request.post('/api/v1/template/').send(example.templates).expect(200);
            const responseRoute = await request.post('/api/v1/route/').send(example.appRoutes).expect(200);

            const response = await request.get('/api/v1/config')
            .expect(200);

            expect(response.text).to.be.a('string');
            expect(response.body).deep.equal({});

            const parsedJSON = JSON.parse(response.text);
            expect(parsedJSON).to.be.an('object');

            expect(parsedJSON.apps).to.be.an('object');
            expect(parsedJSON.templates).to.be.an('object');
            expect(parsedJSON.routes).to.be.an('array');
            expect(parsedJSON.specialRoutes).to.be.an('object');

            expect(parsedJSON.routes).to.deep.include({
                routeId: responseRoute.body.id,
                ..._.pick(example.appRoutes, ['route', 'next', 'slots'])
            });
            expect(parsedJSON.apps[example.apps.name]).deep.equal(_.omit(example.apps, 'name'));
            expect(parsedJSON.templates).has.property(example.templates.name, example.templates.content);

            await request.delete('/api/v1/route/' + responseRoute.body.id).expect(204);
            await request.delete('/api/v1/template/' + example.templates.name).expect(204);
            await request.delete('/api/v1/app/' + encodeURIComponent(example.apps.name)).expect(204);
        })
    });
});
