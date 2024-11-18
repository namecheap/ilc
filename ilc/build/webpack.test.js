/* eslint-env node */
const devConfig = require('./webpack.dev');

const config = {
    ...devConfig,
    optimization: {
        /**
         * Isolate bundles between tests
         * Some tests use the same singletone and it should be re-created each time
         * https://github.com/ryanclark/karma-webpack/issues/506#issuecomment-803163850
         */
        runtimeChunk: false,

        /**
         *
         */
        splitChunks: false,
    },
    devtool: 'inline-source-map',
    performance: {
        hints: false,
    },
};

config.module.rules.push({
    test: /\.(js|ts)$/,
    /**
     * Control coveraage files
     */
    exclude: /(node_modules|\.spec\.(js|ts)$|tests\/)/,
    loader: '@jsdevtools/coverage-istanbul-loader',
    enforce: 'post',
    options: { esModules: true },
});

config.resolve.alias['nock'] = false;
config.resolve.alias['timers'] = false;

module.exports = config;
