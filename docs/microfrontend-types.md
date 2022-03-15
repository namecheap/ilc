# Micro-frontend types

ILC has different categories of micro-frontends. You are free to decide where and how you use each of them. The table below gives you basic recommendations:

| Topic           | Applications                                        | [Parcels](./parcels.md)                 | Global libraries
| --------------- | ----------------------------------------------------| --------------------------------------- | ------------------------------------------------- |
| **SSR support** | :material-plus-box:{.color-green}                   | :material-minus-box:{.color-red}        | :material-minus-box:{.color-red}                  |
| **Routing**     | :material-plus-box:{.color-green} (multiple routes) | :material-minus-box:{.color-red}        | :material-minus-box:{.color-red}                  |
| **API**         | Declarative API                                     | Imperative API                          | Exports a public interface                        |
| **Renders UI**  | :material-plus-box:{.color-green}                   | :material-plus-box:{.color-green}       | :material-plus-minus-box: (may or may not render) |
| **Lifecycles**  | ILC-managed lifecycles                              | Custom managed lifecycles               | External module: no direct single-spa lifecycles  |
| **When to use** | Core building block                                 | To embed part of one app into another   | Useful to share common logic, or create a service |

!!! tip ""
    Each ILC micro-frontend is an [in-browser JavaScript module](https://single-spa.js.org/docs/recommended-setup#in-browser-versus-build-time-modules).

## Applications

Applications are registered in ILC Registry, and their lifecycle (when and where they should appear) is managed by ILC, based on the configuration of _Routers_ and _Templates_.

Applications act as the main building blocks for the website and can be rendered at the server-side to enhance page loading time and SEO/SMO metrics.

### Parcels in Applications

Applications can export [Parcels](./parcels.md) to allow parts of their UI to be used in other apps.

## Parcels

With [Parcels](./parcels.md), you can reuse parts of UI across applications when those applications are written in multiple frameworks. In other words, Parcels is an ILC-specific implementation of web components.

### Use case example

#### Contacts modal

Let's say, you have an `App1` that handles everything related to contacts (highly cohesive) but somewhere in `App2` you need to create a contact.
To to this, you can use several techniques:

1. If both are written in the same framework, you can export/import components.
1. Re-implement creation of a contact (loss of cohesion).
1. Use Parcels.

Exporting a Parcel from `App1` that wraps the `createContact` modal component gives you the ability to share components and behavior across disparate frameworks without losing application cohesion. `App1` can export a modal as _Parcel_, and `App2` can import the Parcel and use it.
