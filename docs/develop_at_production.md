# Develop right at production


## Practical example of using existed MS on our [demo site](http://demo.microfrontends.online/news/)
- run [demo apps](https://github.com/namecheap/ilc-demo-apps) locally
- open [demo site](http://demo.microfrontends.online/news/) and add next cookies:
```js
    const overrideConfig = encodeURIComponent(JSON.stringify({
        apps: {
            '@portal/news': {
                spaBundle: 'http://YOUR_IP:8239/dist/single_spa.js',
                ssr: {
                    src: 'http://YOUR_IP:8239/news/?fragment=1',
                },
                props: {
                    publicPath: 'http://YOUR_IP:8239/dist/',
                },
            },
        },
    }));

    document.cookie = `ILC-overrideConfig=${overrideConfig}; path=/;`

    // to use SSR you should have either static public IP or just use any tools, e.g. https://ngrok.com/
    // if you just need to work with CSR - you can use localhost.

```


## Creating own MS
- first of all, you should take [adapter](https://single-spa.js.org/docs/ecosystem) for your framework, wrap your app with it and export lifecycle functions.
- turn off CORS for development environment.
e.g. for Webpack just add to config:
```js
    devServer: {
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    }
```
- your MS bundle file must be wrapped with(for Webpack you can use [wrapper-webpack-plugin](https://www.npmjs.com/package/wrapper-webpack-plugin)):
```js
"(function(define){\n" + bundle_content + "\n})((window.ILC && window.ILC.define) || window.define);"
```

- your MS should be publicly available. e.g. hosted under 0.0.0.0([default for Node http, so for express too](https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback)) and available under your IP address or any other tools e.g [ngrok](https://ngrok.com/) or smth else.
- add "ILC-overrideConfig" cookie with config to production:
```js
const overrideConfig = encodeURIComponent(
    JSON.stringify({
        "apps": {
            // rewrite existed MS
            "@portal/NAME1": {
                "spaBundle": "http://10.1.150.85:2273/bundle.js", // url to bundle
                "ssr": {
                    "src": "http://10.1.150.85:2273/", // url to ssr
                },
            },
            // add new MS
            "@portal/NAME2": {
                "spaBundle": "http://10.1.150.85:9892/bundle.js", // url to bundle
                "ssr": {
                    "src": "http://10.1.150.85:9891/", // url to ssr
                    "timeout": 1000,
                },
                "kind": "primary",
            },
        },
        // add new MS slot to certain route
        "routes": [
            {
                "routeId": 103,
                "route": "/example/",
                "next": false,
                "slots": {
                    "body": {
                        "appName": "@portal/NAME2",
                        "kind": null
                    },
                },
            },
        ],
    })
);

document.cookie = `ILC-overrideConfig=${overrideConfig}; path=/;`

```
- since you probably run your MS locally via http and if your production site uses https so you will have problems with mixed content when you try to send request to http from https, so the simplest way to resolve it - just turn off checking in your browser. Details [link](https://docs.adobe.com/content/help/en/target/using/experiences/vec/troubleshoot-composer/mixed-content.html).
- if you exclude some libs e.g. via ["externals"](https://github.com/namecheap/ilc/blob/e1ea372f822fc95790e73743c5ad7ddf31e3c892/devFragments/people/webpack.config.js#L95) property of webpack config - comment it during developing at production.


## Trusted origins
You can allow some origins via setting environment variable `OVERRIDE_CONFIG_TRUSTED_ORIGINS`
- default - setting any url is disallowed(for security reasons)
- `all` - trust any origin
- `foo.com, bar.com` - trust only foo.com and bar.com(recommended)
