const chai = require('chai');
const sinon = require('sinon');

const fetchTemplate = require('./fetch-template');

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
        router: {
            getRoute: () => currentRoute,
        },
        ilcState: 'ilcState text',
    };

    const parseTemplate = sinon.stub();

    let fetchTemplateSetup;

    request.router.getFragmentsTpl = (arg) => arg;

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
        });
        sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'special:exist');
    });

    it('should return parseTemplate function with right arguments', async () => {
        currentRoute.template = 'exist';

        await fetchTemplateSetup(request, parseTemplate);

        sinon.assert.calledOnceWithExactly(parseTemplate, 'inject text', 'ilcState text');
    });
});
