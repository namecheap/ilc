'use strict';

// See: https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration

const config = require('config');

exports.config = { 
    agent_enabled: config.get('newrelic.licenseKey') !== null,
    app_name: [`ILC${process.env.NODE_ENV ? '@' + process.env.NODE_ENV : ''}`],
    license_key: config.get('newrelic.licenseKey'),
    logging: {
        level: 'info',
        logging: true,
        filepath: 'stdout'
    },
    allow_all_headers: true,
    attributes: {
        /**
         * Prefix of attributes to exclude from all destinations. Allows * as wildcard
         * at end.
         *
         * NOTE: If excluding headers, they must be in camelCase form to be filtered.
         *
         * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
         */
        exclude: [
            'request.headers.cookie',
            'request.headers.authorization',
            'request.headers.proxyAuthorization',
            'request.headers.setCookie*',
            'request.headers.x*',
            'response.headers.cookie',
            'response.headers.authorization',
            'response.headers.proxyAuthorization',
            'response.headers.setCookie*',
            'response.headers.x*'
        ]
    },
    rules: {
        ignore: [
            '^\/ping$'
        ]
    },
};
