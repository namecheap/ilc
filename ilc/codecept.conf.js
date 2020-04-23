const path = require('path');
const config = require('config');
const presettings = require('./codecept.presettings');

exports.config = {
  output: path.join(__dirname, '.codecept_output', 'artifacts'),
  helpers: {
    Puppeteer: {
      url: `http://localhost:${config.port}`,
      show: true,
      windowSize: '1200x900',
    },
    MockRequestHelper: {
      require: '@codeceptjs/mock-request',
      mode: 'record',
      recordIfMissing: true,
      recordFailedRequests: false,
      expiresIn: null,
      persisterOptions: {
        keepUnusedRequests: false,
        fs: {
          recordingsDir: path.join(__dirname, '.codecept_output', 'requests'),
        },
      },
    },
  },
  mocha: {},
  bootstrap: presettings.bootstrap,
  teardown: presettings.teardown,
  hooks: [],
  plugins: {
    screenshotOnFail: {
      enabled: true,
    },
    retryFailedStep: {
      enabled: true,
    },
    autoDelay: {
      enabled: true,
    },
    puppeteerCoverage: {
      enabled: true,
      coverageDir: path.join(__dirname, '.codecept_output', 'coverage'),
    },
  },
  tests: './spec/**/*.spec.e2e.ts',
  name: 'ilc',
  require: ['ts-node/register'],
}
