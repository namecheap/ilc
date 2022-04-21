ILC allows you to check a route before navigating to it.

To handle it, you need to create an [ILC transition hooks plugin](#ilc-transition-hooks-plugin) using the [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk){: target=_blank} :octicons-link-external-16: to cover cases that depend on accessing any route.

![ILC transition hooks](./assets/transition_hooks.gif)

## ILC transition hooks plugin

ILC transition hooks plugin should follow a specific [interface](https://github.com/namecheap/ilc-plugins-sdk/tree/master/src/plugins/transitionHooks){: target=_blank} :octicons-link-external-16: that the [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk){: target=_blank} :octicons-link-external-16: provides for this plugin.

ILC gets transition hooks from the plugin and calls them before navigating a route. It works for both SSR and CSR.

There are the following options to handle the navigation event:
1. Stop navigation and use your custom behavior such as authentication form as an example to navigate whenever you need (CSR).
2. Redirect to a new location (CSR, SSR).
3. Continue navigation (CSR, SSR).

From ILC, every transition hook receives route information (URL, route meta information that a route has in the [ILC registry](./registry.md)).

The provided route information allows you to handle only the routes that you need. For example, in the ILC Registry, you can mark some routes as _protected_ in the Metadata field, and handle navigation to those marked routes as required.

![Route meta field in ILC registry](./assets/route_meta_field.gif)

!!! example "Example of the default ILC transition hooks plugin"
    Check an example of the [default ILC transition hooks plugin](https://github.com/namecheap/ilc-plugins-sdk/tree/master/src/plugins/transitionHooks){: target=_blank} :octicons-link-external-16: in [ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk){: target=_blank} :octicons-link-external-16:

### Server-side API

Transition hooks are **asynchronous** on the server-side.

From ILC, every hook receives _route information_, _ILC logger_, and the _current request_ on the server-side.

!!! warning ""
    You have to use the ILC logger when you need to log inside of your hook. ILC has its own log interface on the server-side, so every application or plugin should follow it.

### Client-side API

Transition hooks are **synchronous** on the client side. ILC calls them on each History change event.

From ILC, every hook receives _route information_ and _navigate method_ on the client-side.

!!! warning ""
    Whenever you need to navigate to a route from your hook, you need to use that provided _navigate method_ to keep the ILC SPA routing mechanism safe.

## Demo

Check the [demo website](http://ilc-demo.namecheap.technology/hooks/){: target=_blank} :octicons-link-external-16: to see how hooks work in ILC.
