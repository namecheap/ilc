# ILC transition hooks

ILC provides an opportunity to check a route before navigate to it and the only thing that you need to do to handle it is to create ILC transition hooks plugin with the help of [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk) to cover any cases that depend on access to any routes.

![ILC transition hooks](./assets/transition_hooks.gif)

## ILC transition hooks plugin

ILC transition hooks plugin should follow a specific [interface](https://github.com/namecheap/ilc-plugins-sdk/tree/master/src/plugins/transitionHooks) that is provided by [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk) for this plugin.

ILC gets transition hooks from a plugin and calls them before navigating to a route. It works for _CSR_ and _SSR_. You have the following several options what to do with a navigation event:

1. Stop navigation and use your custom behavior such as authentication form as an example to navigate whenever you need then (_CSR_);
2. Redirect to a new location (_CSR_, _SSR_);
3. Continue navigation (_CSR_, _SSR_).

Every transition hook receives route information (_URL_, _route meta information_ that a route has in [ILC registry](./registry.md)) from ILC.

Provided information allows you to handle only specific routes that you need. As an example, you can mark some routes as _protected_ in _meta field_ of a route in ILC registry and do something with navigation to those marked routes.

![Route meta field in ILC registry](./assets/route_meta_field.gif)

There is a [default ILC transition hooks plugin](https://github.com/namecheap/ilc-plugins-sdk/tree/master/src/plugins/transitionHooks) in [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk) that you can use an example.

### Server side API

Transition hooks are _async_ on server side.

Every hook receives route information, _ILC logger_ and current _request_ on server side from ILC.

**Important!** You have to use that provided _ILC logger_ when you need to log something inside of your hook because ILC has own log interface on server side, so every application or plugin should follow it.

### Client side API

Transition hooks are _sync_ on client side and ILC calls them per each History change event.

Every hook receives route information and _navigate_ method on client side from ILC.

**Important!** Whenever you need to navigate to a route from your hook you need to use that provided _navigate_ method to keep ILC SPA routing mechanism safe.

## Demo

You can see an example how it works in ILC on our [demo website](http://demo.microfrontends.online/hooks/).
