const newrelic = require('newrelic');

/**
 * @param {Error} err
 * @param {Object} [errInfo]
 */
module.exports = function (err, errInfo) {
    const infoData = Object.assign(errInfo);
    if (err.data) {
        Object.assign(infoData, err.data);
    }

    newrelic.noticeError(err, infoData);

    console.error(JSON.stringify({
        type: err.name,
        message: err.message,
        stack: err.stack.split("\n"),
        additionalInfo: infoData,
    }));
};
