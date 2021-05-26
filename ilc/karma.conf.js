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

    /**
     * Force to use glob config to be able to run specific test files
     * @example npm run test:client:watch -- --glob=./client/WrapApp.spec.js
     *
     * Otherwise used default files mask
     */
    const files = config.glob ? [config.glob] : [
        'client/**/*.spec.js',
        'common/**/*.spec.js',
        'systemjs/**/*.spec.js',
        {
            pattern: 'systemjs/spec/fixtures/**/*.js',
            included: false,
        },
    ];

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
        files,
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
            'systemjs/**/*.spec.js': [
                'webpack',
                'sourcemap',
            ],
        },
        reporters: [
            'mocha',
            'coverage',
        ],
        mochaReporter: {
            showDiff: true,
        },
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
            devtool: false
        },
        webpackMiddleware: {
            noInfo: true
        },
    });
};
