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

See more information about the [lifecycle functions here](https://single-spa.js.org/docs/building-applications/#lifecyle-props).

### Custom props that are passed to every app

* `domElementGetter(): HTMLElement` - returns ref to `HTMLElement` that should be used as container to render app's content
* `getCurrentPathProps(): {}` - returns _Props_ that were defined for current path
* `getCurrentBasePath(): string` - returns same value as `basePath` param in `routerProps` query parameter
* `errorHandler(error, errorInfo = {}): void` - app MUST use it to propagate all unhandled errors
* `appId` - Unique application ID, if same app will be rendered twice on a page - it will get different IDs


### Init code during app bundle loading

Sometimes you need to run some initialization code right after app bundle will be loaded in the browser and usually you 
want to be able to pass some configuration properties to that code.

ILC allows you to export a function called `mainSpa(props)` that will receive application properties that were defined in 
_Registry_ in it's first argument. 
This function should return an object with "single-spa" [lifecycle functions](https://single-spa.js.org/docs/building-applications/#lifecyle-props).

**Example of possible use case:**
```javascript
// File specified as Webpack entry point
export const mainSpa = (props) => {
	if (props.publicPath) {
		__webpack_public_path__ = props.publicPath;
	} else {
		console.warn(`Can't determine value of the "__webpack_public_path__", falling back to default one...`);
	}

	return require('./app-bootstrap'); // Returns: {bootstrap: () => {}, mount: () => {}, unmount: () => {}}
};
```