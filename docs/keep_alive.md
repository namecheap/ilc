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

## Memory

A kept-alive application is retained on purpose: its DOM stays in its hidden container and its JavaScript state stays
with it. Retention is bounded by configuration, not by navigation:

- single-spa registers one application per app and slot pair, as before; keep-alive creates no per-URL instances. The
  number of kept-alive instances in a slot is at most the number of distinct applications that some route marks
  `keepAlive` in that slot. The operator fixes that set in the registry; a user cannot grow it by navigating.
- A kept-alive application is freed when it leaves a route that lists it without `keepAlive`, when a route brings it
  back with other props and it has no `update` lifecycle (a remount), or when the page is left (another template, a
  reload).
- Per hide and show ILC allocates nothing that accumulates: the per-app container is created once and moved, the
  router keeps one record per hidden application that is overwritten on every hide and deleted on unmount, and
  `ilc:app-visibility` is a plain `CustomEvent` with no listener on the ILC side.
- ILC does not pause a hidden application. Timers, sockets, subscriptions and key handlers keep running until the
  application reacts to `visible: false`; a cache that grows in a hidden application grows the page.
- There is no cap on kept-alive applications: a limit that unmounted an application behind the user's back would also
  close the floating window it owns. Keep the set small; if a limit is ever needed it should be an explicit registry
  setting with a predictable rule, not a heuristic.

## Resetting state when an application is shown again

A user who returns to a calendar may expect today's view, not the week they left. ILC never resets a kept-alive
application by itself: it cannot tell precious state (an open editor, a half-written draft) from stale state (last
week's view). Three mechanisms, from cheapest to fullest:

1. **The URL on show.** The application's router re-syncs on `visible: true`: `/calendar/` without a date maps to
   today, `/calendar/2026-09` reached with the back button maps to that month. The view follows the URL the user
   arrived with; everything else the application chose to keep stays.
2. **A partial reset on the visibility event.** On `visible: true` reset what should not survive (jump to today,
   scroll to top, refetch after a long time hidden) and keep what should (the composer window). The application saw
   `visible: false` and can note the time.
3. **A full reset from configuration.** Different slot props on the route that brings the application back trigger
   `update` or a remount; a route that lists the application without `keepAlive` unmounts it when it leaves. An
   application can also rebuild its own tree on `visible: true` (a new `key` on the React root) while staying mounted
   for ILC: a full reset with no bundle reload and no page transition.

## Limits and good practice

- Keep-alive keeps the application's DOM and JavaScript state in memory. Use it for a small number of applications that
  share one slot, not for every route of a site.
- Hidden applications are not part of the ILC page transition: switching back to a kept-alive application shows it at
  once, without the global spinner.
- A full page load (a navigation to a route with another template, a reload) starts with no kept-alive applications.
- Applications in a keep-alive slot must render into the element returned by `domElementGetter`; floating UI may live outside it (see above).
