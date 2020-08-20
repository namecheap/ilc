'use strict';

const pino = require('pino');
const httpHeaders = require('http-headers');
const uniqid = require('uniqid');

const pinoConf = {
    level: 'info',
    messageKey: 'message',
    timestamp: () => `,"dateTime":"${new Date(Date.now()).toISOString()}"`,
    formatters: {
        level: (label, number) => ({ level: label }),
        bindings (bindings) {
            return { hostName: bindings.hostname }
        },
        log (object) {
            //object.dateTime = object.time;
            //console.log(object);
            object.serviceName = 'ILC';

            if (object.req) {
                const req = pino.stdSerializers.req(object.req);
                delete req.headers;
                delete req.id;
                object.clientIp = req.remoteAddress;
                delete req.remoteAddress;
                object.userIp = object.req.ip;
                object.fields = req;
                object.path = req.url.split('?')[0];
                delete object.req;
            } else if (object.res) {
                object.fields = processResponse(object.res);
                delete object.res;
            }
            return object;
        }
    },
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
                    type: 'Business', //TODO: more advanced logic, see https://collab.namecheap.net/display/NA/Spaceship+Errors+System
                    origin: 'self', //TODO: more advanced logic, see https://collab.namecheap.net/display/NA/Spaceship+Errors+System
                    name: err.name,
                    stacktrace: err.stack,
                };
                const fields = {};
                if (err.data) {
                    fields.additionalInfo = err.data;
                }
                if (causeData.length) {
                    fields.causeData = causeData;
                }
                inputArgs[0] = {
                    error: logObj,
                    message: `${logObj.name}: ${err.message}`,
                    fields
                };
            }

            return method.apply(this, inputArgs)
        }
    }
};

function processResponse(res) {
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

module.exports = {
    logger: pino(pinoConf),
    requestIdLogLabel: 'operationId',
    genReqId: () => uniqid().substring(0, 16),
};
