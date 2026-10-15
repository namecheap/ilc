const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    devtool: 'source-map',
    output: {
        devtoolNamespace: 'ilcRegistry',
        assetModuleFilename: 'img/[hash][ext][query]',
    },
    module: {
        rules: [
            {
                test: /\.(t|j)sx?$/,
                exclude: /node_modules/,
                use: { loader: 'babel-loader' },
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                use: { loader: 'html-loader' },
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            { test: /\.svg$/, loader: 'file-loader' },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
    ].concat(process.env.NODE_ENV === 'development' ? [new BundleAnalyzerPlugin({ openAnalyzer: false })] : []),
    resolve: {
        extensions: ['.ts', '.js', '.tsx', '.json'],
        alias: {
            // react-admin 3 imports { parse, stringify } from 'query-string'. query-string >= 8 (needed for
            // decode-uri-component >= 0.5.0, GHSA-vcc3-ghjq-m6fr) only has a default export, and its package
            // "exports" hide the module with the named ones, so point the bare specifier at that module directly.
            'query-string$': path.join(__dirname, 'node_modules/query-string/base.js'),
        },
    },
};
