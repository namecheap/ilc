import path from 'path';

import { bootstrap } from './codecept.presettings';

const outputDir = path.join(__dirname, '.codecept_output');

export const config: CodeceptJS.MainConfig = {
    output: outputDir,
    rerun: {
        minSuccess: 3,
        maxReruns: 5,
    },
    helpers: {
        Puppeteer: {
            url: `http://localhost:8233`,
            windowSize: '1200x900',
            chrome: {
                headless: process.env.SHOW_UI === 'true' ? false : 'new',
            },
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
            uniqueScreenshotNames: true,
        },
        // Adds assertions to API https://www.npmjs.com/package/codeceptjs-chai
        ChaiWrapper: {
            require: 'codeceptjs-chai',
        },
    },
    mocha: {
        reporterOptions: {
            'codeceptjs-cli-reporter': {
                stdout: '-',
                options: {
                    verbose: true,
                    steps: true,
                },
            },
            mochawesome: {
                stdout: path.join(outputDir, 'console.log'),
                options: {
                    reportDir: outputDir,
                    reportFilename: 'report',
                },
            },
        },
    },
    bootstrap,
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
        pauseOnFail: {},
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
