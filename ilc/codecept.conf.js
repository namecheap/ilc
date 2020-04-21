const config = require('config');

exports.config = {
  output: './.codecept_output',
  helpers: {
    Puppeteer: {
      url: `http://localhost:${config.port}`,
      show: true,
      windowSize: '1200x900'
    },
    MockRequest: {}
  },
  include: {
    I: './spec/steps.e2e.js'
  },
  mocha: {},
  bootstrap: null,
  teardown: null,
  hooks: [],
  plugins: {
    screenshotOnFail: {
      enabled: true
    },
    retryFailedStep: {
      enabled: true
    },
    autoDelay: {
      enabled: true
    }
  },
  tests: './spec/**/*.spec.e2e.js',
  name: 'ilc'
}