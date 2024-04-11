const serveStatic = require('serve-static');
const cors = require('cors');

module.exports = function (isProduction) {
    if (isProduction) {
        return serveStatic('public');
    }

    require('../../systemjs/build');

    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpack = require('webpack');
    const webpackConfig = require('../../build/webpack.dev');
    const compiler = webpack(webpackConfig);

    return [cors({ origin: true }), webpackDevMiddleware(compiler), serveStatic('public')];
};
