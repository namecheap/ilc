const path = require('path');
const config = require('config');

exports.config = {
    output: path.join(__dirname, '.codecept_output', 'artifacts'),
    helpers: {
        Puppeteer: {
            url: `http://localhost:${config.port}`,
            show: true,
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
    bootstrap: './codecept.presettings.js',
    teardown: './codecept.presettings.js',
    hooks: [],
    plugins: {
        screenshotOnFail: {
            enabled: true,
        },
        retryFailedStep: {
            enabled: true,
        },
        autoDelay: {
            enabled: true,
        },
        puppeteerCoverage: {
            enabled: true,
            coverageDir: path.join(__dirname, '.codecept_output', 'coverage'),
        },
    },
    include: {
        peoplePage: path.join(__dirname, 'spec', 'pages', 'people.ts'),
        newsPage: path.join(__dirname, 'spec', 'pages', 'news.ts'),
        planetsPage: path.join(__dirname, 'spec', 'pages', 'planets.ts'),
    },
    tests: './spec/**/*.spec.e2e.ts',
    name: 'ilc',
    require: ['ts-node/register'],
}
