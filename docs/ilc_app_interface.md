# ILC to App interface

This document aims to describe communication interface used by ILC 
to talk to apps (micro frontends).

## Server side interface

Please see [ilc-server-sdk](https://github.com/namecheap/ilc-server-sdk) library to figure out how to integrate server side
of your isomorphic micro frontend with ILC.

> **Note:** keep in mind that Server side interface integration is necessary only for isomorphic micro frontend. However
ILC also supports apps that have client side rendering only.

## Client side interface

During the course of a single-spa page, registered applications are loaded, bootstrapped (initialized), mounted, unmounted, and unloaded. 
ILC (with the help of the [single-spa](https://single-spa.js.org/)) provides hooks into each phase via `lifecycles`.

See more information about the [lifecycle functions here](https://single-spa.js.org/docs/building-applications#lifecyle-props).

### Custom props that are passed to every app

* `domElementGetter(): HTMLElement` - returns ref to `HTMLElement` that should be used as container to render app's content
* `getCurrentPathProps(): {}` - returns _Props_ that were defined for current path
* `getCurrentBasePath(): string` - returns same value as `basePath` param in `routerProps` query parameter
* `errorHandler(error, errorInfo = {}): void` - app MUST use it to propagate all unhandled errors

