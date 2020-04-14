/* eslint-env node */
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WrapperPlugin = require('wrapper-webpack-plugin');


module.exports = {
    entry: path.resolve(__dirname, 'src/people.js'),
    output: {
        filename: 'people.js',
        libraryTarget: 'amd',
        path: path.resolve(__dirname, 'build'),
    },
    mode: 'production',
    module: {
        rules: [
            {parser: {System: false}},
            {
                test: /\.js?$/,
                exclude: [path.resolve(__dirname, 'node_modules')],
                loader: 'babel-loader',
            },
            {
                test: /\.css$/,
                exclude: [path.resolve(__dirname, 'node_modules'), /\.krem.css$/],
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            localIdentName: '[path][name]__[local]',
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins() {
                                return [
                                    require('autoprefixer')
                                ];
                            },
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                include: [path.resolve(__dirname, 'node_modules')],
                exclude: [/\.krem.css$/],
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.krem.css$/,
                exclude: [path.resolve(__dirname, 'node_modules')],
                use: [
                    {
                        loader: 'kremling-loader',
                        options: {
                            namespace: 'people',
                            postcss: {
                                plugins: {
                                    'autoprefixer': {}
                                }
                            }
                        },
                    },
                ]
            },
        ],
    },
    resolve: {
        modules: [
            __dirname,
            'node_modules',
        ],
    },
    plugins: [
        new CleanWebpackPlugin(['build/people']),
        new CopyWebpackPlugin([
            {from: path.resolve(__dirname, 'src/people.js')}
        ]),
        new WrapperPlugin({
            test: /\.js$/, // only wrap output of bundle files with '.js' extension
            header: '(function(define){\n',
            footer: '\n})((window.ILC && window.ILC.define) || window.define);'
        }),
    ],
    devtool: 'source-map',
    externals: [
        /^@portal\/*/,
        /^single-spa$/,
        /^rxjs\/?.*$/,
        /^react$/,
        /^react\/lib.*/,
        /^react-dom$/,
        /.*react-dom.*/,
    ],
};

