const path = require('path');

const preSettings = require('./codecept.presettings.js');

const outputDir = path.join(__dirname, '.codecept_output');

exports.config = {
    output: outputDir,
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
                    recordingsDir: path.join(outputDir, 'requests'),
                },
            },
        },
        Mochawesome: {
            uniqueScreenshotNames: true
        },
        // Adds assertions to API https://www.npmjs.com/package/codeceptjs-chai
        ChaiWrapper : {
            require: 'codeceptjs-chai'
        }
    },
    mocha: {
        reporterOptions: {
            'codeceptjs-cli-reporter': {
                stdout: "-",
                options: {
                    verbose: true,
                    steps: true,
                }
            },
            mochawesome: {
                stdout: path.join(outputDir, 'console.log'),
                options: {
                    reportDir: outputDir,
                    reportFilename: "report"
                }
            },
        }
    },
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
