import ErrorNotifier from '../../common/ErrorNotifier';

const newrelic = window.newrelic;

export default new ErrorNotifier({
    provider: newrelic,
});
