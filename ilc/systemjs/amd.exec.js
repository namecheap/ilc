'use strict';

const fs = require('fs');

const origSource = fs.readFileSync(require.resolve('systemjs/dist/extras/amd.min'));

const wrappedCode = '' +
    '(function (glob) {' +
        'const self = undefined; glob.ILC = glob; const global = glob;' +
        origSource +
    '})(typeof self !== "undefined" ? self : global);';

module.exports = wrappedCode;