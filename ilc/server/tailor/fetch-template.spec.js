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

  const registryService = {
    getTemplate: async (arg) => {
      const result = await arg;

      return result;
    },
  };

  let currentRoute = {};

  const request = {
    router: {
      getRoute: () => currentRoute,
    },
    ilcState: 'ilcState text',
  };

  const parseTemplate = sinon.stub();

  request.router.getFragmentsTpl = (arg) => arg;

  afterEach(() => {
    newrelic.setTransactionName.resetHistory();
    parseTemplate.reset();

    for (let key in currentRoute) {
      delete currentRoute[key];
    }
  });

  it('should throw Error if template is undefined', async () => {
    currentRoute.template = undefined;

    await chai.expect(fetchTemplate({}, {}, registryService)(request)).to.eventually.rejectedWith('Can\'t match route base template to config map');
  });

  it('RegExp should work correctly', async () => {
    currentRoute.template = 'exist';
    currentRoute.route = '/exist';

    await fetchTemplate(configsInjector, newrelic, registryService)(request, parseTemplate);

    sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'exist');
  });

  it('should set transaction name in newrelic if there is no route', async () => {
    currentRoute.template = 'exist';
    currentRoute.specialRole = 'exist';

    await fetchTemplate(configsInjector, newrelic, registryService)(request, parseTemplate);

    sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'special:exist');
  });

  it('should return parseTemplate function with right arguments', async () => {
    currentRoute.template = 'exist';

    await fetchTemplate(configsInjector, newrelic, registryService)(request, parseTemplate);

    sinon.assert.calledOnceWithExactly(parseTemplate, 'inject text', 'ilcState text');
  });
});
