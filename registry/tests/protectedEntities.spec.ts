import config from 'config';
import sinon from 'sinon';
import { type Agent } from 'supertest';
import { expect, request } from './common';

const templateName = 'ncTestProtectedEntitiesTemplate';
const routerDomain = Object.freeze({
    domainName: 'protected-entities.example.com',
    template500: templateName,
});
const sharedProps = Object.freeze({
    name: 'ncTestProtectedEntitiesProps',
    props: { testProp: 'value' },
});

describe('Protected entities (protectedEntities config)', () => {
    let req: Agent;
    let domainId: number;
    let configStub: sinon.SinonStub | undefined;
    const originalGet = config.get.bind(config);

    const enableProtection = (entities = 'router_domains,shared_props,templates') => {
        configStub = sinon.stub(config, 'get').callsFake((setting: string) => {
            return setting === 'protectedEntities' ? entities : originalGet(setting);
        });
    };
    const disableProtection = () => {
        configStub?.restore();
        configStub = undefined;
    };

    before(async () => {
        req = await request();
        await req.post('/api/v1/template/').send({
            name: templateName,
            content: '<html><head></head><body>ncTestTemplateContent</body></html>',
        });
        const domainResponse = await req.post('/api/v1/router_domains/').send(routerDomain);
        domainId = domainResponse.body.id;
        await req.post('/api/v1/shared_props/').send(sharedProps);
    });

    after(async () => {
        disableProtection();
        await req.delete(`/api/v1/router_domains/${domainId}`);
        await req.delete(`/api/v1/shared_props/${sharedProps.name}`);
        await req.delete(`/api/v1/template/${templateName}`);
    });

    afterEach(() => {
        disableProtection();
    });

    it('should not mark entities as protected by default', async () => {
        const domainResponse = await req.get(`/api/v1/router_domains/${domainId}`).expect(200);
        expect(domainResponse.body.protected).to.be.undefined;

        const sharedPropsResponse = await req.get(`/api/v1/shared_props/${sharedProps.name}`).expect(200);
        expect(sharedPropsResponse.body.protected).to.be.undefined;

        const templateResponse = await req.get(`/api/v1/template/${templateName}`).expect(200);
        expect(templateResponse.body.protected).to.be.undefined;
    });

    it('should mark configured entities as protected in single-entity responses', async () => {
        enableProtection();

        const domainResponse = await req.get(`/api/v1/router_domains/${domainId}`).expect(200);
        expect(domainResponse.body.protected).to.be.true;

        const sharedPropsResponse = await req.get(`/api/v1/shared_props/${sharedProps.name}`).expect(200);
        expect(sharedPropsResponse.body.protected).to.be.true;

        const templateResponse = await req.get(`/api/v1/template/${templateName}`).expect(200);
        expect(templateResponse.body.protected).to.be.true;
    });

    it('should mark configured entities as protected in list responses', async () => {
        enableProtection();

        const domainsResponse = await req.get('/api/v1/router_domains/').expect(200);
        const domainItem = domainsResponse.body.find((item: any) => item.id === domainId);
        expect(domainItem.protected).to.be.true;

        const sharedPropsResponse = await req.get('/api/v1/shared_props/').expect(200);
        const sharedPropsItem = sharedPropsResponse.body.find((item: any) => item.name === sharedProps.name);
        expect(sharedPropsItem.protected).to.be.true;

        const templatesResponse = await req.get('/api/v1/template/').expect(200);
        const templateItem = templatesResponse.body.find((item: any) => item.name === templateName);
        expect(templateItem.protected).to.be.true;
    });

    describe('special routes', () => {
        let regularRouteId: number;
        let specialRouteId: number;

        before(async () => {
            const regular = await req.post('/api/v1/route/').send({
                route: '/ncTestProtectedEntitiesRoute/*',
                domainId,
                orderPos: 12_345,
                slots: {},
            });
            regularRouteId = regular.body.id;
            const special = await req.post('/api/v1/route/').send({ specialRole: '404', domainId, slots: {} });
            specialRouteId = special.body.id;
        });

        after(async () => {
            await req.delete(`/api/v1/route/${specialRouteId}`);
            await req.delete(`/api/v1/route/${regularRouteId}`);
        });

        it('should protect only special routes when "special_routes" is configured', async () => {
            enableProtection('special_routes');

            const special = await req.get(`/api/v1/route/${specialRouteId}`).expect(200);
            expect(special.body.protected).to.be.true;

            const regular = await req.get(`/api/v1/route/${regularRouteId}`).expect(200);
            expect(regular.body.protected).to.be.undefined;
        });

        it('should protect only regular routes when "routes" is configured', async () => {
            enableProtection('routes');

            const regular = await req.get(`/api/v1/route/${regularRouteId}`).expect(200);
            expect(regular.body.protected).to.be.true;

            const special = await req.get(`/api/v1/route/${specialRouteId}`).expect(200);
            expect(special.body.protected).to.be.undefined;
        });

        it('should protect special routes in list responses', async () => {
            enableProtection('special_routes');

            const specialList = await req.get('/api/v1/route?filter=%7B%22showSpecial%22%3Atrue%7D').expect(200);
            const specialItem = specialList.body.find((item: any) => item.id === specialRouteId);
            expect(specialItem.protected).to.be.true;

            const regularList = await req.get('/api/v1/route/').expect(200);
            const regularItem = regularList.body.find((item: any) => item.id === regularRouteId);
            expect(regularItem.protected).to.be.undefined;
        });

        it('should not protect any routes by default', async () => {
            const special = await req.get(`/api/v1/route/${specialRouteId}`).expect(200);
            expect(special.body.protected).to.be.undefined;

            const regular = await req.get(`/api/v1/route/${regularRouteId}`).expect(200);
            expect(regular.body.protected).to.be.undefined;
        });
    });

    it('should keep the API writable for protected entities', async () => {
        enableProtection();

        await req.put(`/api/v1/router_domains/${domainId}`).send(routerDomain).expect(200);
        await req.put(`/api/v1/shared_props/${sharedProps.name}`).send({ props: sharedProps.props }).expect(200);
    });
});
