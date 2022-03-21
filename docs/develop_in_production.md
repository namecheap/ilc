ILC allows you to develop your micro frontends in the context of the production environment. It means that you can render your new application or change the version of the existing one directly at the 
production website.

With this approach, you can see the final result faster without the need to mock other micro frontends inside your local development environment (LDE).

## Example

This example shows how to develop your application within the [demo site](http://ilc-demo.namecheap.technology/news/{: target=_blank} :octicons-link-external-16:).

Imagine that you are trying to substitute the News application with the one that is launched locally, considering that the [demo site](http://ilc-demo.namecheap.technology/news/){: target=_blank} :octicons-link-external-16: is your production environment.

To do this:

1. Run the demo applications locally. Follow the [instructions from the "Development process" section](https://github.com/namecheap/ilc-demo-apps){: target=_blank} :octicons-link-external-16:.
1. Expose your local applications:
    * If you don't have a "white" IP address, use [ngrok](https://ngrok.com/){: target=_blank} :octicons-link-external-16: or a similar tool.
        
        !!! note "ngrok usage"
            1. [Download & install ngrok](https://ngrok.com/download){: target=_blank} :octicons-link-external-16:.
            1. Run `ngrok http 8239` (as the _News application_ uses the `8239` port).
            1. Use the exposed URL (it looks as follows: `http://c6960219.ngrok.io`).

    * If you do have a "white" IP address, use the following URL: `http://your_public_ip:8239`

1. Open the [demo site](http://ilc-demo.namecheap.technology/news/){: target=_blank} :octicons-link-external-16: and add the following cookies:

    ```js
    const exposedUrl = 'http://c6960219.ngrok.io'; // or http://your_public_ip:8239
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
 
1. Refresh http://ilc-demo.namecheap.technology/news/ multiple times.
    * In the "Network" tab of the browser developer tools, ensure that part of the requests is passed to the URL specified in the `exposedUrl` variable.
1. Make some changes in your local _News application_. For example:
    1. Go to the cloned `ilc-demo-apps` repository.
    1. Open the `/apps/news-ssr/src/components/Home.vue` file.
    1. Replace `<h1>Pick a news source</h1>` with `<h1>Hello world</h1>`.
    1. Navigate to the http://ilc-demo.namecheap.technology/news/ URL and check that the changes appeared on the Demo website (You should see the h1 heading with the "Hello world" text).
1. Check that SSR works correctly:
    1. [Turn off Javascript in your browser](https://www.enable-javascript.com){: target=_blank} :octicons-link-external-16:
    
    After reloading the page, you should still see the correct "Hello world" heading.

## Security considerations

The possibility of overriding ILC configuration for the browser using cookies introduces a risk of [website defacement](https://en.wikipedia.org/wiki/Website_defacement){: target=_blank} :octicons-link-external-16: attack via [XSS](https://owasp.org/www-community/attacks/xss/){: target=_blank} :octicons-link-external-16:.

To mitigate this risk, ILC restricts (by default) all domains and real IP addresses specified for all links in configuration. Only [private IPv4 addresses](https://en.wikipedia.org/wiki/Private_network){: target=_blank} :octicons-link-external-16: are allowed.

To allow specific origins, in the "Settings" page of the ILC Registry, set the `overrideConfigTrustedOrigins` property:
- `default`: any origin is disallowed, except for [private IPv4 addresses](https://en.wikipedia.org/wiki/Private_network){: target=_blank} :octicons-link-external-16:
- `all`: trust any origins
- `foo.com, bar.com`: trust `foo.com` and `bar.com` only (recommended)

## Create your MS

1. Take the [adapter](https://single-spa.js.org/docs/ecosystem){: target=_blank} :octicons-link-external-16: for your framework, wrap your application with it, and export lifecycle functions.
1. Turn off CORS for the development environment.
    
    ??? example "Webpack config to disable CORS"
        ```js
        devServer: {
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        }
        ```

1. Wrap your MS bundle file with the following code:

    ```js
    "(function(define){\n" + bundle_content + "\n})((window.ILC && window.ILC.define) || window.define);"
    ```

    !!! note ""
        For Webpack, you can use [wrapper-webpack-plugin](https://www.npmjs.com/package/wrapper-webpack-plugin){: target=_blank} :octicons-link-external-16:

1. Make sure your MS is publicly available - that is, hosted under 0.0.0.0 ([default for Node http, and Express](https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback){: target=_blank} :octicons-link-external-16:) and exposed via your public IP address or with the help of specialized tools, like ngrok.
1. Add `ILC-overrideConfig` cookie with the following configuration to production:

    ```js
    const overrideConfig = encodeURIComponent(
        JSON.stringify({
            "apps": {
                // rewrite the existing MS
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

1. Check that requests are not affected by the mixed content issue. If yes, you can [turn off this check in your browser](https://docs.adobe.com/content/help/en/target/using/experiences/vec/troubleshoot-composer/mixed-content.html){: target=_blank} :octicons-link-external-16:.
1. If you excluded some libraries (for example, via the [`externals`](https://github.com/namecheap/ilc/blob/e1ea372f822fc95790e73743c5ad7ddf31e3c892/devFragments/people/webpack.config.js#L95){: target=_blank} :octicons-link-external-16: property of the webpack configuration), comment it when developing in production.

## Shared libraries

Shared libraries are developed the same way as MSs. You only need to provide library name (without `@sharedLibrary/` prefix) and path to spa-bundle:

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
