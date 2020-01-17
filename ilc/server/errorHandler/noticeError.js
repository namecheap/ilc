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
        type: error.name,
        message: error.message,
        stack: error.stack.split("\n"),
        additionalInfo: infoData,
    }));
};
