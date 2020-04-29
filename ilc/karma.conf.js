const path = require('path');
const webpackConfig = require('./build/webpack');
const nycConfig = require('./nyc.config');

const getThresholds = () => ({
    statements: nycConfig.statements,
    branches: nycConfig.branches,
    functions: nycConfig.functions,
    lines: nycConfig.lines
});

module.exports = function (config) {
    config.set({
        singleRun: true,
        browsers: [
            'ChromeHeadless',
        ],
        customLaunchers: {
            ChromeHeadlessWithoutSecurity: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },
        frameworks: [
            'mocha',
            'chai',
            'sinon',
        ],
        plugins: [
            'karma-chrome-launcher',

            'karma-mocha',
            'karma-chai',
            'karma-sinon',

            'karma-coverage',
            'karma-mocha-reporter',

            'karma-webpack',
            'karma-sourcemap-loader',
        ],
        files: [
            'client/**/*.js',
            'common/**/*.js',
        ],
        preprocessors: {
            'client/**/!(*.spec).js': [
                'webpack',
                'sourcemap',
                'coverage',
            ],
            'common/**/!(*.spec).js': [
                'webpack',
                'sourcemap',
                'coverage',
            ],

            'client/**/*.spec.js': [
                'webpack',
                'sourcemap',
            ],
            'common/**/*.spec.js': [
                'webpack',
                'sourcemap',
            ],
        },
        reporters: [
            'mocha',
            'coverage',
        ],
        coverageReporter: {
            dir: path.join(__dirname, '.karma_output', 'coverage'),
            subdir: (browser) => browser.toLowerCase().split(/[\s/-]/)[0],
            reporters: nycConfig.reporter.map((type) => ({
                type,
            })),
            instrumenterOptions: {
                istanbul: {
                    noCompact: true,
                },
            },
            check: {
                global: getThresholds(),
                each: getThresholds(),
            },
            watermarks: {
                ...nycConfig.watermarks,
            },
        },
        webpack: {
            ...webpackConfig,
        },
        webpackMiddleware: {
            noInfo: true
        },
    });
};
