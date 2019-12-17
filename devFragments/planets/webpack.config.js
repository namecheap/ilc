const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/planets.js'),
  output: {
    filename: 'planets.js',
    libraryTarget: 'amd',
    path: path.resolve(__dirname, 'build/planets'),
  },
  mode: 'production',
  module: {
    rules: [
      {parser: {System: false}},
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        exclude: [path.resolve(__dirname, 'node_modules')],
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new CleanWebpackPlugin(['build/planets']),
  ],
  devtool: 'source-map',
  externals: [
    /^@portal\/*/,
    /^single-spa$/,
    /^rxjs\/?.*$/,
  ],
}
