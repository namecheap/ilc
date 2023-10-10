'use strict';

const fs = require('fs');
const path = require('path');

const origSource = fs.readFileSync(path.resolve(__dirname, '../node_modules/systemjs/dist/extras/amd.min.js'));

const wrappedCode =
    '' +
    '(function (glob) {' +
    'const self = undefined; glob.ILC = {}; glob.ILC.System = glob.System; const global = glob.ILC;' +
    origSource +
    '})(typeof self !== "undefined" ? self : global);';

module.exports = wrappedCode;
