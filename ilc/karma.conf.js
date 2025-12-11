const path = require('path');
const webpackConfig = require('./build/webpack.test');
const nycConfig = require('./nyc.config');

const getThresholds = () => ({
    statements: nycConfig.statements,
    branches: nycConfig.branches,
    functions: nycConfig.functions,
    lines: nycConfig.lines,
});

module.exports = function (config) {
    /**
     * Force to use glob config to be able to run specific test files
     * @example npm run test:client:watch -- --glob=./client/WrapApp.spec.js
     *
     * Otherwise used default files mask
     */
    const files = config.glob
        ? [config.glob]
        : [
              'client/**/*.spec.+(js|ts)',
              'common/**/*.spec.+(js|ts)',
              'systemjs/**/*.spec.+(js|ts)',
              {
                  pattern: 'systemjs/spec/fixtures/**/*.js',
                  included: false,
              },
          ];

    config.set({
        client: {
            captureConsole: true,
        },
        singleRun: true,
        browsers: ['ChromeHeadless'],
        customLaunchers: {
            ChromeHeadlessWithoutSecurity: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },
        customContextFile: './tests/karma.index.html',
        frameworks: ['mocha', 'chai', 'sinon', 'webpack'],
        plugins: [
            'karma-bail-fast',
            'karma-chrome-launcher',

            'karma-mocha',
            'karma-chai',
            'karma-sinon',

            'karma-coverage-istanbul-reporter',
            'karma-mocha-reporter',

            'karma-webpack',
            'karma-sourcemap-loader',
        ],
        files,
        preprocessors: {
            'client/**/*.spec.+(js|ts)': ['webpack', 'sourcemap'],
            'common/**/*.spec.+(js|ts)': ['webpack', 'sourcemap'],
            'systemjs/**/*.spec.+(js|ts)': ['webpack', 'sourcemap'],
        },
        reporters: ['bail-fast', 'mocha', 'coverage-istanbul'],
        mochaReporter: {
            showDiff: true,
        },
        coverageIstanbulReporter: {
            // reports can be any that are listed here: https://github.com/istanbuljs/istanbuljs/tree/73c25ce79f91010d1ff073aa6ff3fd01114f90db/packages/istanbul-reports/lib
            reports: nycConfig.reporter,

            // base output directory. If you include %browser% in the path it will be replaced with the karma browser name
            dir: path.join(__dirname, '.karma_output', 'coverage'),

            // Combines coverage information from multiple browsers into one report rather than outputting a report
            // for each browser.
            combineBrowserReports: true,

            // if using webpack and pre-loaders, work around webpack breaking the source path
            fixWebpackSourcePaths: true,

            // Omit files with no statements, no functions and no branches covered from the report
            skipFilesWithNoCoverage: true,

            // Most reporters accept additional config options. You can pass these through the `report-config` option
            'report-config': {
                // all options available at: https://github.com/istanbuljs/istanbuljs/blob/73c25ce79f91010d1ff073aa6ff3fd01114f90db/packages/istanbul-reports/lib/html/index.js#L257-L261
                html: {
                    // outputs the report in ./coverage/html
                    subdir: 'html',
                },
            },

            // enforce percentage thresholds
            // anything under these percentages will cause karma to fail with an exit code of 1 if not running in watch mode
            thresholds: {
                emitWarning: false, // set to `true` to not fail the test command when thresholds are not met
                // thresholds for all files
                global: getThresholds(),
                // thresholds per file
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
            noInfo: true,
        },
    });
};
