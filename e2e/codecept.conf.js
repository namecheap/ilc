const path = require('path');

const preSettings = require('./codecept.presettings.js');

exports.config = {
    output: path.join(__dirname, '.codecept_output', 'artifacts'),
    helpers: {
        Puppeteer: {
            url: `http://localhost:8233`,
            show: process.env.SHOW_UI === 'true',
            windowSize: '1200x900',
        },
        MockRequestHelper: {
            require: '@codeceptjs/mock-request',
            mode: 'record',
            recordIfMissing: true,
            recordFailedRequests: false,
            expiresIn: null,
            persisterOptions: {
                keepUnusedRequests: false,
                fs: {
                    recordingsDir: path.join(__dirname, '.codecept_output', 'requests'),
                },
            },
        },
    },
    mocha: {},
    bootstrap: preSettings.bootstrap,
    teardown: preSettings.teardown,
    hooks: [],
    plugins: {
        screenshotOnFail: {
            enabled: true,
        },
        retryFailedStep: {
            enabled: true
        },
        autoDelay: {
            enabled: true,
        },
    },
    include: {
        peoplePage: path.join(__dirname, 'spec', 'pages', 'people.ts'),
        newsPage: path.join(__dirname, 'spec', 'pages', 'news.ts'),
        planetsPage: path.join(__dirname, 'spec', 'pages', 'planets.ts'),
        hooksPage: path.join(__dirname, 'spec', 'pages', 'hooks.ts'),
        common: path.join(__dirname, 'spec', 'pages', 'common.ts'),
    },
    tests: './spec/**/*.spec.e2e.ts',
    name: 'ilc',
    require: ['ts-node/register'],
};
