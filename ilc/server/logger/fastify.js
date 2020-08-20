'use strict';

const _ = require('lodash');
const pluginManager = require('../pluginManager/factory');


let fastifyConf = pluginManager.getReportingPlugin();
if (fastifyConf === null) {
    const hyperid = require('hyperid')
    const instance = hyperid({urlSafe: true, fixedLength: true});

    fastifyConf = {
        logger: require('./index'),
        genReqId: instance,
    }
}

module.exports = _.omit(_.pick(fastifyConf, ['logger', 'requestIdLogLabel', 'genReqId']), _.isEmpty);
