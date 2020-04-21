# ILC to App interface

This document aims to describe communication interface used by ILC 
to talk to apps (micro frontends).

## Server side interface

### Input interface ILC -> App
With every request for SSR content from the app ILC sends the following meta-information:
1. Query parameter `routerProps`

   Contains base64 encoded JSON object with the following keys:
   * `basePath` - Base path that is relative to the matched route.
   
       So for `reqUrl = /a/b/c?d=1` & matched route `/a/*` base path will be `/a/`.
       While for `reqUrl = /a/b/c?d=1` & matched route `/a/b/c` base path will be `/a/b/c`.
   * `reqUrl` - Request URL string. This contains only the URL that is present in the actual HTTP request.
       
       `reqUrl` = `/status?name=ryan` if the request is:
       ```
       GET /status?name=ryan HTTP/1.1\r\n
       Accept: text/plain\r\n
       \r\n
       ```
   * _(legacy)_ `fragmentName` - string with name of the fragment
1. Query parameter `appProps`
  
   Sent only if app has some _Props_ defined at the app or route slot level.
   Contains base64 encoded JSON object with defined _Props_.
  
1. Header `x-request-uri`. Request URL string. This contains only the URL that is present in the actual HTTP request.

Both query params mentioned here can be decoded in the following manner:
```javascript
JSON.parse(Buffer.from(req.query.routerProps, 'base64').toString('utf-8'))
```

### Response interface App -> ILC

App possible response headers:

* `Link` - Check [reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link).
* `x-head-title` - _(only primary app)_ Page title encoded with base64. Will be injected onto `<head>` tag.
Ex: `Buffer.from('<title>Page title</title>', 'utf-8').toString('base64')`
* `x-head-meta` - _(only primary app)_ Page [meta tags](https://www.w3schools.com/tags/tag_meta.asp) encoded with base64.
Ex: `Buffer.from('<meta name="description" content="Free Web tutorials"><meta name="keywords" content="HTML,CSS,XML,JavaScript">', 'utf-8').toString('base64')`

HTTP status code from the primary app will be used to define HTTP status code of the requested page.

## Client side interface

During the course of a single-spa page, registered applications are loaded, bootstrapped (initialized), mounted, unmounted, and unloaded. 
ILC (with the help of the [single-spa](https://single-spa.js.org/)) provides hooks into each phase via `lifecycles`.

See more information about the [lifecycle functions here](https://single-spa.js.org/docs/building-applications#lifecyle-props).

### Custom props that are passed to every app

* `domElementGetter(): HTMLElement` - returns ref to `HTMLElement` that should be used as container to render app's content
* `getCurrentPathProps(): {}` - returns _Props_ that were defined for current path
* `getCurrentBasePath(): string` - returns same value as `basePath` param in `routerProps` query parameter
* `errorHandler(error, errorInfo = {}): void` - app MUST use it to propagate all unhandled errors

### Page transitions spinner
You can set own spinner with help of your main html-template:
```js
   <script>
        window.ilcConfig = {
            tmplSpinner: '<div class="spinner">loading...</div>',
        }
    </script>
```
