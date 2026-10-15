// mocha-multi loads reporters with require(). CodeceptJS 4 ships its CLI reporter as an ES module, which
// require() returns as a namespace object, so hand mocha-multi the default export (the reporter itself).
module.exports = require('codeceptjs/lib/mocha/cli').default;
