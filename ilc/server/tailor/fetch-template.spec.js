const chai = require('chai');
const sinon = require('sinon');

const { fetchTemplate } = require('./fetch-template');

describe('fetch templates', () => {
    const configsInjector = {
        inject: () => 'inject text',
    };

    const newrelic = {
        setTransactionName: sinon.spy(),
    };

    const defaultGetTemplate = async (arg) => {
        const result = await arg;
        return result;
    };

    const registryService = {
        getTemplate: defaultGetTemplate,
    };

    let currentRoute = {};

    const request = {
        headers: {
            'x-request-host': 'test.com',
        },
        registryConfig: {
            settings: {},
        },
        router: {
            getRoute: () => currentRoute,
        },
        ilcState: 'ilcState text',
    };

    const parseTemplate = sinon.stub();

    let fetchTemplateSetup;

    request.router.getFragmentsTpl = () => 'ilcState text';

    beforeEach(() => {
        fetchTemplateSetup = fetchTemplate(configsInjector, newrelic, registryService);
    });

    afterEach(() => {
        newrelic.setTransactionName.resetHistory();
        parseTemplate.reset();
        currentRoute = {};
        registryService.getTemplate = defaultGetTemplate;
    });

    it('should throw Error if template is undefined', async () => {
        currentRoute.template = undefined;

        await chai
            .expect(fetchTemplateSetup(request))
            .to.eventually.rejectedWith("Can't match route base template to config map");
    });

    it('RegExp should work correctly', async () => {
        currentRoute.template = 'exist';
        currentRoute.route = '/exist';

        registryService.getTemplate = sinon.stub().resolves({ data: 'exist' });
        await fetchTemplateSetup(request, parseTemplate);

        sinon.assert.calledOnceWithExactly(registryService.getTemplate, 'exist', {
            forDomain: 'test.com',
            routeKey: '/exist',
            forwardedHeaders: undefined,
        });
        sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'exist');
    });

    it('should set transaction name in newrelic if there is no route', async () => {
        currentRoute.template = 'exist';
        currentRoute.specialRole = 'exist';

        registryService.getTemplate = sinon.stub().resolves({ data: 'exist' });
        await fetchTemplateSetup(request, parseTemplate);

        sinon.assert.calledOnceWithExactly(registryService.getTemplate, 'exist', {
            forDomain: 'test.com',
            routeKey: 'special:exist',
            forwardedHeaders: undefined,
        });
        sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'special:exist');
    });

    it('should forward headers listed in templateProxyHeaders setting when present in request', async () => {
        currentRoute.template = 'exist';
        currentRoute.route = '/exist';

        const requestWithProxyHeaders = {
            ...request,
            headers: {
                'x-request-host': 'test.com',
                'x-forwarded-for': '1.2.3.4',
                'x-real-ip': '5.6.7.8',
                'x-secret': 'should-not-forward',
            },
            registryConfig: {
                settings: {
                    templateProxyHeaders: ['X-Forwarded-For', 'X-Real-IP'],
                },
            },
        };

        registryService.getTemplate = sinon.stub().resolves({ data: 'exist' });
        await fetchTemplateSetup(requestWithProxyHeaders, parseTemplate);

        sinon.assert.calledOnceWithExactly(registryService.getTemplate, 'exist', {
            forDomain: 'test.com',
            routeKey: '/exist',
            forwardedHeaders: {
                'x-forwarded-for': '1.2.3.4',
                'x-real-ip': '5.6.7.8',
            },
        });
    });

    it('should pass forwardedHeaders as undefined when templateProxyHeaders is null', async () => {
        currentRoute.template = 'exist';
        currentRoute.route = '/exist';

        const requestWithNullProxyHeaders = {
            ...request,
            headers: { 'x-request-host': 'test.com', 'x-forwarded-for': '1.2.3.4' },
            registryConfig: { settings: { templateProxyHeaders: null } },
        };

        registryService.getTemplate = sinon.stub().resolves({ data: 'exist' });
        await fetchTemplateSetup(requestWithNullProxyHeaders, parseTemplate);

        sinon.assert.calledOnceWithExactly(registryService.getTemplate, 'exist', {
            forDomain: 'test.com',
            routeKey: '/exist',
            forwardedHeaders: undefined,
        });
    });

    it('should return parseTemplate function with right arguments', async () => {
        currentRoute.template = 'exist';

        await fetchTemplateSetup(request, parseTemplate);

        sinon.assert.calledOnceWithExactly(parseTemplate, 'inject text', 'ilcState text');
    });
});
