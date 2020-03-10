/* eslint-env node */
const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, '../client.js'),
    output: {
        filename: 'client.js',
        path: path.resolve(__dirname, '../public'),
    },
    mode: 'production',
    module: {
        rules: [
            { parser: { System: false } },
            {
                test: /\.js?$/,
                exclude: /node_modules\/(?!(@namecheap\/error-extender)\/).*/,
                loader: 'babel-loader',
            },
        ],
    },
    resolve: {
        modules: [
            __dirname,
            'node_modules',
        ],
        alias: {
            'single-spa': require.resolve('single-spa/lib/umd/single-spa.min.js'),
        }
    },
    plugins: [],
    devtool: 'source-map',
    externals: [],
};

