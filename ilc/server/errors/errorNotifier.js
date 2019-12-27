const newrelic = require('newrelic');
const ErrorNotifier = require('../../common/errors/ErrorNotifier');

module.exports = new ErrorNotifier({
    provider: newrelic,
});
