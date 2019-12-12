'use strict';

const fs = require('fs');

const origSource = fs.readFileSync(require.resolve('systemjs/dist/extras/amd.min'));

const wrappedCode = '' +
    '(function (glob) {' +
        'const self = undefined; glob.ILC = {}; const global = glob.ILC;' +
        origSource +
    '})(typeof self !== "undefined" ? self : global);';

module.exports = wrappedCode;