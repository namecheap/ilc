'use strict';

const fs = require('fs');
const path = require('path');

const dest = path.resolve(__dirname, '../public');
!fs.existsSync(dest) ? fs.mkdirSync(dest) : 0;

const sources = [];

sources.push(require.resolve('systemjs/dist/system.min'));
sources.push(require.resolve('./amd.exec.js'));
sources.push(require.resolve('systemjs/dist/extras/use-default.min'));
sources.push(require.resolve('systemjs-css-extra/dist/css.min'));
sources.push(require.resolve('./systemjs-name-resolver'));
sources.push(require.resolve('./systemjs-transform-loader'));

fs.writeFileSync(`${dest}/system.js`, sources.reduce((res, v) => {
    if (/\.exec\.js$/.test(v)) {
        return res + "\n\n" + require(v);
    }

    return res + "\n\n" + fs.readFileSync(v);
}, ''));

console.log('SystemJS build finished!');
