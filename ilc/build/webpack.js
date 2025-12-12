/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { DefinePlugin, BannerPlugin, Compilation } = require('webpack');
const { DuplicateIlcPluginsWebpackPlugin, ResolveIlcDefaultPluginsWebpackPlugin } = require('ilc-plugins-sdk/webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const { Environment } = require('../common/Environment');
const ilcPluginsPath = path.resolve(__dirname, '../../node_modules/');

const environment = new Environment(process.env);

const systemJsBundleFile = path.resolve(__dirname, '../public/system.js');
const systemJsBanner = () => fs.readFileSync(systemJsBundleFile, 'utf-8');

module.exports = {
    entry: path.resolve(__dirname, '../client.js'),
    output: {
        filename: 'client.js',
        path: path.resolve(__dirname, '../public'),
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.(js|ts)$/,
                use: [
                    {
                        loader: 'babel-loader',
                    },
                ],
                exclude: /node_modules/,
            },
            { parser: { System: false } },
            {
                test: /\.js?$/,
                exclude: /node_modules\/(?!(@namecheap\/error-extender)\/).*/,
                loader: 'babel-loader',
            },
        ],
    },
    resolve: {
        modules: [__dirname, 'node_modules'],
        alias: {
            'single-spa': require.resolve('single-spa/lib/umd/single-spa.min.js'),
        },
        extensions: ['.js', '.ts'],
        plugins: [new ResolveIlcDefaultPluginsWebpackPlugin(ilcPluginsPath)],
    },
    plugins: [
        new DuplicateIlcPluginsWebpackPlugin(ilcPluginsPath),
        new BannerPlugin({
            test: /\.js$/,
            banner: systemJsBanner,
            raw: true,
            stage: Compilation.PROCESS_ASSETS_STAGE_REPORT + 1,
        }),
        new DefinePlugin({
            LEGACY_PLUGINS_DISCOVERY_ENABLED: JSON.stringify(environment.isLegacyPluginsDiscoveryEnabled()),
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: 'tsconfig.client.json',
            },
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
        }),
    ],
    devtool: 'source-map',
    externals: [],
    /**
     * Very slow performance on macos with webpack-dev-middleware
     * https://github.com/webpack/watchpack/issues/222
     */
    watchOptions: {
        poll: 1000,
    },
    performance: {
        hints: 'error',
        maxEntrypointSize: 250000,
    },
};
