import ErrorNotifier from '../../common/errors/ErrorNotifier';

const newrelic = window.newrelic;

export default new ErrorNotifier({
    provider: newrelic,
});
