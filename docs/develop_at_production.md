# Develop right at production


## Practical example of using existed MS on our [demo site](http://demo.microfrontends.online/news/)
We created demo site with a few examples of React and Vue apps with SSR and hydration.

- To run these demo apps locally you need just:
    - clone repo `git clone https://github.com/namecheap/ilc-demo-apps.git`.
    - start in development mode [ilc-demo-apps#development-process](https://github.com/namecheap/ilc-demo-apps#development-process).
- if you use NAT - you need [ngrok](https://ngrok.com/) or any another similar tool to create public url for exposing your local apps.
    - [download](https://ngrok.com/download) ngrok.
    - configuration in just a few steps is on the same [download page](https://ngrok.com/download).
    - news app uses 8239 port, so run `ngrok http 8239` and you will receive your exposed url, e.g. `http://c6960219.ngrok.io`.
- open [demo site](http://demo.microfrontends.online/news/) and add next cookies:
```js
    const exposedUrl = 'http://c6960219.ngrok.io'; // or if you don't have NAT - http://YOUR_PUBLIC_IP:8239
    const overrideConfig = encodeURIComponent(JSON.stringify({
        apps: {
            '@portal/news': {
                spaBundle: exposedUrl+ '/dist/single_spa.js',
                ssr: {
                    src: exposedUrl + '/news/?fragment=1',
                },
                props: {
                    publicPath: exposedUrl + '/dist/',
                },
            },
        },
    }));

    document.cookie = `ILC-overrideConfig=${overrideConfig}; path=/;`
```
- that's all. so let's try to make some update in our local news app.
- go to cloned demo apps, open the file `/ilc-demo-apps/apps/news-ssr/src/components/Home.vue` and replace `<h1>Pick a news source</h1>` with `<h1>Hello world</h1>`.
- go to browser and refresh page [http://demo.microfrontends.online/news/](http://demo.microfrontends.online/news/).
- if everything is ok, you will see h1 with text "Hello world".
- and one more step is let's try to check SSR:
    - turn off javascript with the help of dev-tools of your browser. e.g. [explanation how to do it for Chrome](https://developers.google.com/web/tools/chrome-devtools/javascript/disable)
    - and after reloading of the page we still see correct page with h1 - Hello world

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
