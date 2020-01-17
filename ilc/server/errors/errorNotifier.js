const newrelic = require('newrelic');
const ErrorNotifier = require('../../common/ErrorNotifier');

module.exports = new ErrorNotifier({
    provider: newrelic,
});
