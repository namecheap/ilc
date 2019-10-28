const path = require("path");
const webpack = require("webpack");
const vueConfig = require('./vue.loader.config');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	devtool: false,
	output: {
		path: path.resolve(__dirname, '../dist'),
		publicPath: 'http://127.0.0.1:3000/dist/',
		filename: '[name].[chunkhash].js'
	},
	resolve: {
		alias: {
			'public': path.resolve(__dirname, '../public')
		}
	},
	module: {
		noParse: /es6-promise\.js$/,
		rules: [
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: vueConfig
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /(node_modules|single-spa-vue)/
			},
			{
				test: /\.(png|jpg|gif|svg)$/,
				loader: 'url-loader',
				options: {
					limit: 10000,
					name: '[name].[ext]?[hash]'
				}
			},
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
						use: 'css-loader?minimize',
						fallback: 'vue-style-loader'
					})
			}
		]
	},
	performance: {
		maxEntrypointSize: 300000,
		hints: 'warning'
	},
	plugins: [
			new webpack.optimize.UglifyJsPlugin({
				compress: { warnings: false }
			}),
			new webpack.optimize.ModuleConcatenationPlugin(),
			new ExtractTextPlugin({
				filename: 'common.[chunkhash].css'
			})
		]
};
