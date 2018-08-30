const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/common-deps.js',
  output: {
    filename: 'common-deps.js',
    path: path.resolve(__dirname, 'build/common-deps'),
    chunkFilename: '[name].js',
  },
  mode: 'production',
  node: {
    fs: 'empty',
  },
  resolve: {
    modules: [
      __dirname,
      'node_modules',
    ],
    alias: {
      // Only put things in here when webpack isn't already doing the "right" thing for performance by default.
      // This is usually when there is a preminified file that the npm package publishes but webpack doesn't know
      // it should use.
      lodash: path.resolve(__dirname, 'node_modules/lodash/lodash.min.js'),
      systemjs: path.resolve(__dirname, 'node_modules/systemjs/dist/system.js'),
    }
  },
  devtool: 'sourcemap',
  plugins: [
    new CleanWebpackPlugin(['build/common-deps/']),
    CopyWebpackPlugin([
      {from: path.resolve(__dirname, 'src/common-deps.js')}
    ]),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        }
      }
    ]
  }
}
