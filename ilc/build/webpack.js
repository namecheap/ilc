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
      {parser: {System: false}},
      {
        test: /\.js?$/,
        exclude: [path.resolve(__dirname, 'node_modules')],
        loader: 'babel-loader',
      },
    ],
  },
  resolve: {
    modules: [
      __dirname,
      'node_modules',
    ],
  },
  plugins: [],
  devtool: 'source-map',
  externals: [],
};

