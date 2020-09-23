# Compatibility with legacy UMD bundles

When adding ILC to the legacy website - sometimes you may face an issue when code that you still 
load via regular `<script>` tags may work incorrectly. This happens when you load external libraries packed as UMD bundles.

By default, ILC exposes `window.define` variable - which forces all UMD bundles to be registered within ILC (through System.js).
While this approach is convenient for the new projects - it may break things on the legacy ones. 
As without ILC and System.js running you expect content of the UMD bundle to be registered as window variable.

In order to fix the issue - you need to run ILC Docker container with the following environment variable in place:
`AMD_DEFINE_COMPATIBILITY_MODE=true`.

This will remove `window.define` variable so all your libs should instead use `window.ILC.define`.

When using webpack - here is how you can force usage of `window.ILC.define` while building the apps for ILC:

```javascript
const WrapperPlugin = require('wrapper-webpack-plugin');

module.exports = {
    entry: 'src/app.js',
    output: {
        filename: 'app.js',
        libraryTarget: 'amd',
    },
    module: { /* ... */ },
    plugins: [
        new WrapperPlugin({
            test: /\.js$/, // only wrap output of bundle files with '.js' extension
            header: '(function(define){\n',
            footer: '\n})((window.ILC && window.ILC.define) || window.define);'
        }),
    ],
};


```

 