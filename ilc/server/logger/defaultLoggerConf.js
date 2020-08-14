const httpHeaders = require('http-headers');
const pino = require('pino');

module.exports = {
    level: 'info',
    //nestedKey: 'payload', TODO: blocked by https://github.com/pinojs/pino/issues/883
    hooks: {
        logMethod(inputArgs, method) {
            if (inputArgs[0] instanceof Error) {
                const err = inputArgs[0];

                const causeData = [];
                let rawErr = err.cause;
                while (rawErr) {
                    if (rawErr.data) {
                        causeData.push(rawErr.data);
                    } else {
                        causeData.push({});
                    }
                    rawErr = rawErr.cause;
                }

                const logObj = {
                    type: err.name,
                    message: err.message,
                    stack: err.stack.split("\n"),
                };
                if (err.data) {
                    logObj.additionalInfo = err.data;
                }
                if (causeData.length) {
                    logObj.causeData = causeData;
                }
                inputArgs[0] = logObj;
            }

            return method.apply(this, inputArgs)
        }
    },
    serializers: {
        res(res) {
            const r = {
                statusCode: res.statusCode,
            };

            if (r.statusCode >= 300 && r.statusCode < 400) {
                const headers = httpHeaders(res, true);
                if (headers['location']) {
                    r.headers = {
                        location: headers['location']
                    };
                }
            }

            return r;
        }
    }
};
