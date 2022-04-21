When adding ILC to the legacy website, you may have an issue when the code that is loaded via regular `<script>` tags works incorrectly.
This happens when you load external libraries packed as UMD bundles.

By default, ILC exposes the `window.define` variable that forces all UMD bundles to be registered within ILC (via System.js). While this approach is convenient for the new projects, it may break things for the legacy ones. 
The reason is that without ILC and System.js running, the content of the UMD bundle is to be registered as a `window` variable.

To fix the issue, you need to enable the `amdDefineCompatibilityMode=true` on the Settings page in the ILC Registry. It removes the `window.define` variable, so all your libraries will use `window.ILC.define` instead.

If you use webpack, you can force the usage of `window.ILC.define` when building applications for ILC:

```js
const ilcWebpackPluginsFactory = require('ilc-sdk').WebpackPluginsFactory;

module.exports = {
    entry: 'src/app.js',
    output: {
        filename: 'app.js',
        libraryTarget: 'amd',
    },
    module: { /* ... */ },
    plugins: ilcWebpackPluginsFactory().client,
};
```
