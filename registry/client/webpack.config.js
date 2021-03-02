const HtmlWebpackPlugin = require('html-webpack-plugin');
const IgnoreNotFoundExportPlugin = require('ignore-not-found-export-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
    .BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
    devtool: 'source-map',
    output: {
        devtoolNamespace: 'ilcRegistry'
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
            {test: /\.svg$/, loader: 'file-loader'}
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'src/img/'), to: path.resolve(__dirname, 'dist/img/') },
            ],
        }),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        // required because of https://github.com/babel/babel/issues/7640
        new IgnoreNotFoundExportPlugin([
            'CallbackSideEffect',
            'ChoicesProps',
            'InputProps',
            'NotificationSideEffect',
            'OptionText',
            'OptionTextElement',
            'RedirectionSideEffect',
            'RefreshSideEffect',
            'AdminUIProps',
            'AdminContextProps',
            'AdminRouterProps',
            'ReferenceArrayProps',
            'ReferenceManyProps',
            'LinkToType',
            'FormContext',
            'UseReferenceProps',
            'SortProps',
            'PaginationProps',
        ]),
    ].concat(
        process.env.NODE_ENV === 'development'
            ? [new BundleAnalyzerPlugin()]
            : []
    ),
    resolve: {
        extensions: ['.ts', '.js', '.tsx', '.json'],
    },
    devServer: {
        stats: {
            children: false,
            chunks: false,
            modules: false,
        },
    },
};
