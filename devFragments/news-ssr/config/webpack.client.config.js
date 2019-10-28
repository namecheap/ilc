const merge = require("webpack-merge");
const webpack = require("webpack");
const baseConfig = require("./webpack.base.config");
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

module.exports = merge(baseConfig, {
	entry: {
		app: './src/entry-client.js'
	},
	resolve: {
		alias: {
			'axios-client': './axios-client.js'
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: '"production"'
			}
		}),
		// it is common to extract deps into a vendor chunk for better caching.
		new webpack.optimize.CommonsChunkPlugin({
			name: 'vendor',
			minChunks: function (module) {
				// a module is extracted into the vendor chunk when...
				return (
					// if it's inside node_modules
					/node_modules/.test(module.context) &&
					// do not externalize if the request is a CSS file
					!/\.css$/.test(module.request)
				)
			}
		}),
		new webpack.optimize.CommonsChunkPlugin({
			name: 'manifest'
		}),
		new VueSSRClientPlugin()
	]
});
