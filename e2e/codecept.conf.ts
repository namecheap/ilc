import path from 'path';

import { bootstrap, teardown } from './codecept.presettings';

const outputDir = path.join(import.meta.dirname, '.codecept_output');

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
        // Adds assertions to API https://www.npmjs.com/package/codeceptjs-chai
        ChaiWrapper: {
            require: 'codeceptjs-chai',
        },
    },
    mocha: {
        reporterOptions: {
            './codeceptjs-cli-reporter.cjs': {
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
    teardown,
    hooks: [],
    plugins: {
        screenshot: {
            enabled: true,
            // Previously taken from the Mochawesome helper's config, which CodeceptJS 4 removed.
            uniqueScreenshotNames: true,
        },
        retryFailedStep: {
            enabled: true,
        },
        autoDelay: {
            enabled: true,
        },
        pause: {},
    },
    include: {
        peoplePage: path.join(import.meta.dirname, 'spec', 'pages', 'people.ts'),
        newsPage: path.join(import.meta.dirname, 'spec', 'pages', 'news.ts'),
        planetsPage: path.join(import.meta.dirname, 'spec', 'pages', 'planets.ts'),
        hooksPage: path.join(import.meta.dirname, 'spec', 'pages', 'hooks.ts'),
        common: path.join(import.meta.dirname, 'spec', 'pages', 'common.ts'),
    },
    tests: './spec/**/*.spec.e2e.ts',
    name: 'ilc',
    require: ['tsx/esm'],
    noGlobals: true,
};
