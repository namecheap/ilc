# Develop right at "production"

ILC gives you ability to develop your Micro Frontends in context of the "production" environment.
This means that you can render your new app or changed version of the existing one right at the 
production website.

This gives you ability to see the final result sooner w/o necessity to mock other Micro Frontends inside your
local development environment.

## Practical example, how to develop your app within our [demo site](http://demo.microfrontends.online/news/)

Let's imagine that our [demo site](http://demo.microfrontends.online/news/) is your production environment.
And let's try to substitute _News app_ with the one that you'll run locally.

1. Run our demo apps locally. To do so, follow the instruction here [ilc-demo-apps#development-process](https://github.com/namecheap/ilc-demo-apps#development-process).
1. If you're behind NAT and don't have "white" IP address on your machine - use [ngrok](https://ngrok.com/) or any another similar tool to create public url for exposing your local apps.
    - [Download & install](https://ngrok.com/download) ngrok using instruction from their website.
    - As _News app_ uses `8239` port – run `ngrok http 8239` and you will receive your exposed url, e.g. `http://c6960219.ngrok.io`.
1. Open [demo site](http://demo.microfrontends.online/news/) and add next cookies:
    ```javascript
    const exposedUrl = 'http://c6960219.ngrok.io'; // or if you don't have NAT - http://YOUR_PUBLIC_IP:8239
    const overrideConfig = encodeURIComponent(JSON.stringify({
        apps: {
            '@portal/news': {
                spaBundle: exposedUrl + '/dist/single_spa.js',
                cssBundle: exposedUrl + '/dist/common.css',
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
1. Try to refresh http://demo.microfrontends.online/news/ several times & using "Network" tabs in browser dev tools ensure 
that some requests now go to the URL we specified before in `exposedUrl` variable.
1. Now let's try to make some changes in our local _News app_ and see them appeared at our Demo website.
    - Go to cloned `ilc-demo-apps` repo, open the file `/ilc-demo-apps/apps/news-ssr/src/components/Home.vue` and replace `<h1>Pick a news source</h1>` with `<h1>Hello world</h1>`.
    - Now switch to your browser and refresh page http://demo.microfrontends.online/news/.
    - If everything is ok, you will see h1 with text "Hello world".
1. Last step is to check that SSR works correctly:
    - Turn off javascript with the help of dev-tools in your browser. e.g. [explanation how to do it for Chrome](https://developers.google.com/web/tools/chrome-devtools/javascript/disable)
    - And after reload of the page we still see correct page with h1 - Hello world



## Security considerations

The fact that you can override ILC config for particular browser using cookies introduces a risk of having 
[website defacement](https://en.wikipedia.org/wiki/Website_defacement) attack with the help of [XSS](https://owasp.org/www-community/attacks/xss/).
To mitigate this risk ILC by default will restrict all domains and all real IPs (only [private IPv4 addresses](https://en.wikipedia.org/wiki/Private_network) are allowed) specified for all links in configuration. 

However you can allow additional origins via property "overrideConfigTrustedOrigins", on "Settings" page of ILC Registry.
- **default** - any origin is disallowed, except for [private IPv4 addresses](https://en.wikipedia.org/wiki/Private_network)
- `all` - trust any origins
- `foo.com, bar.com` - trust only foo.com and bar.com (recommended)

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

## Shared libraries
Shared libraries support the same way of developing like MSs. You just need to provide library name (w/o prefix "@sharedLibrary/") and path to spa-bundle:
```js
const overrideConfig = encodeURIComponent(
    JSON.stringify({
        "sharedLibs": {
            "sampleLibrary": {
                "spaBundle": 'http://10.1.150.85:9001/bundle.js',
            },
        },
    })
);

document.cookie = `ILC-overrideConfig=${overrideConfig}; path=/;`
```