const chai = require('chai');
const sinon = require('sinon');

const fetchTemplates = require('./fetch-template');

describe('fetch templates', () => {
  const configsInjector = {
    inject: sinon.stub(),
  };

  const newrelic = {
    setTransactionName: sinon.spy(),
  };

  const registryService = {
    getTemplate: (arg) => arg,
  };

  const request = {
    router: {},
    ilcState: 'ilcState text'
  };

  const parseTemplate = sinon.stub();

  request.router.getFragmentsTpl = function(arg) {
    return `${arg}`
  };

  it('should throw Error if template is undefined', async () => {
    request.router.getRoute = function() {
      return {
        template: undefined,
      }
    };

    await chai.expect(fetchTemplates({}, {}, registryService)(request)).to.eventually.rejectedWith('Can\'t match route base template to config map');
  });

  it('should set transaction name in newrelic', async () => {
    request.router.getRoute = function() {
      return {
        template: 'exist',
        route: 'exist',
        specialRole: '',
      }
    };

    await fetchTemplates(configsInjector, newrelic, registryService)(request, parseTemplate)

    sinon.assert.calledOnceWithExactly(newrelic.setTransactionName, 'exist');
  });

  it('should return parseTemplate function with right arguments', async () => {
    request.router.getRoute = function() {
      return {
        template: 'exist',
      }
    };

    await fetchTemplates(configsInjector, newrelic, registryService)(request, parseTemplate)
    sinon.assert.calledWithExactly(parseTemplate, undefined, 'ilcState text');
  });
});
