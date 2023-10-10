'use strict';

const fs = require('fs');
const path = require('path');

const dest = path.resolve(__dirname, '../public');
!fs.existsSync(dest) ? fs.mkdirSync(dest) : 0;

const sources = [];
const nodeModules = path.resolve(__dirname, '../node_modules');
sources.push(path.resolve(nodeModules, './systemjs/dist/system.min.js'));
sources.push(path.resolve(__dirname, './amd.exec.js'));
sources.push(path.resolve(nodeModules, './systemjs/dist/extras/use-default.min.js'));
sources.push(path.resolve(nodeModules, './systemjs-css-extra/dist/css.min.js'));
sources.push(path.resolve(__dirname, './systemjs-override-importmap.js'));
sources.push(path.resolve(__dirname, './systemjs-name-resolver.js'));

fs.writeFileSync(
    `${dest}/system.js`,
    sources.reduce((res, v) => {
        const resWithNewLine = res === '' ? res : res + '\n\n';

        if (/\.exec\.js$/.test(v)) {
            return resWithNewLine + require(v);
        }

        return resWithNewLine + fs.readFileSync(v);
    }, ''),
);

console.log('SystemJS build finished!');
