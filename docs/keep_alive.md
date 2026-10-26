# Keep-alive slots

## Overview

By default, ILC renders one application per [slot](./routing/route_configuration.md#slot-configuration) at a time:
when a route change puts a different application into a slot, the previous application is **unmounted** and all of its
in-memory state is gone. For many pages that is exactly right. For a product that is split into several applications
that share one slot and behave like tabs of one product (an inbox, a calendar and an address book; a dashboard and its
settings), it is not: the user expects an open editor, a scroll position, a half-filled form or a cache to survive a tab
switch, and a remount costs time on every switch.

A **keep-alive slot** lets a route tell ILC to keep an application mounted when another application takes the slot.
The application is **hidden** instead of unmounted, and **shown** again instead of remounted when a route brings it back.

!!! note ""
Keep-alive is opt-in per route slot and changes nothing for routes that do not use it.

## Registry configuration

Set `keepAlive: true` on the slot of the route (ILC Registry → Routes → Slots → "Keep alive", or the `keepAlive`
field of the slot in the Registry API):

```json
{
    "route": "/inbox/*",
    "slots": {
        "body": { "appName": "@portal/inbox", "keepAlive": true }
    }
}
```

With the configuration above:

- `/inbox/` mounts `@portal/inbox` into the `body` slot as usual.
- A navigation to a route that puts another application into `body` **hides** `@portal/inbox` (its container gets
  `display: none`) and mounts the other application next to it. `@portal/inbox` keeps running.
- A navigation back to `/inbox/` **shows** `@portal/inbox` again. Its `mount` lifecycle is not called again.
- `keepAlive` belongs to the route entry, not to the application: when `@portal/inbox` leaves a route that lists it
  **without** `keepAlive`, it is unmounted as usual. One application can be kept alive on its main routes and dropped
  when it leaves a route where keeping it makes no sense.

## How a keep-alive slot is rendered

Every app of a keep-alive slot renders into its own container inside the slot element, on every route of the slot,
the same way a slot that [lists several apps](./routing/route_configuration.md#slot-configuration) does:

```html
<ilc-slot id="body">
    <div data-ilc-app-id="inbox__at__body" style="display: none">…</div>
    <div data-ilc-app-id="calendar__at__body">…</div>
</ilc-slot>
```

The `domElementGetter` an application receives from ILC returns its own container, and server-side rendered fragments
of such a slot arrive wrapped in that container already. Applications that ignore `domElementGetter` and render
straight into the slot element are not compatible with keep-alive slots: they would wipe the hidden applications.

## Windows that follow the user

ILC hides only the container. Markup an application renders **outside** its container, a floating composer window
appended to `document.body`, a portal, a drawer, stays visible and interactive while the application is hidden,
because the application itself keeps running. That is how a window opened on one tab follows the user to the next
tab without being handed over to another application: it keeps its owner, its state and its save loop. Close or move
such markup in `unmount`; a kept-alive application is unmounted only when ILC remounts it with new props, when it
leaves a route that lists it without `keepAlive`, or when the page is left.

## Visibility event

ILC dispatches `ilc:app-visibility` on `window` whenever it hides or shows a kept-alive application:

```js
window.addEventListener('ilc:app-visibility', (event) => {
    const { appId, appName, slotName, visible } = event.detail;
    if (appName === '@portal/inbox') {
        visible ? resumeTimers() : pauseTimers();
    }
});
```

A hidden application keeps its timers, subscriptions and keyboard handlers unless it reacts to this event. Pause what
should not run in the background (polling, hotkeys, focus management) on `visible: false` and resume on `visible: true`.

An application with its own router (React Router, Vue Router, ...) must also stop following the browser history while
it is hidden: the URL now belongs to the visible application, and a router that keeps listening renders a not-found view
for it or unmounts the application's own pages. Freeze the router on `visible: false` and re-sync it on `visible: true`.
ILC does not block history events from reaching a hidden application.

## Route props

- A hidden application keeps the props it was last shown with; `getCurrentPathProps()` keeps returning them, and
  `getCurrentBasePath()` keeps returning the base path of the route it was last shown on.
- When a route brings a kept-alive application back with **different** slot props, ILC treats it like any other props
  change: it calls the application's `update` lifecycle when the application exposes one and the `onPropsUpdate`
  setting is `update`; otherwise the application is unmounted and mounted again with the new props.

## Limits and good practice

- Keep-alive keeps the application's DOM and JavaScript state in memory. Use it for a small number of applications that
  share one slot, not for every route of a site.
- Hidden applications are not part of the ILC page transition: switching back to a kept-alive application shows it at
  once, without the global spinner.
- A full page load (a navigation to a route with another template, a reload) starts with no kept-alive applications.
- Applications in a keep-alive slot must render into the element returned by `domElementGetter`; floating UI may live outside it (see above).
