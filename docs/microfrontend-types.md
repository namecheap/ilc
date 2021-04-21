# Micro-frontend Types

ILC has different categories of micro-frontends. It is up to you where and how you use each of them. However, here are some recommendations.

| Topic       | Applications                  | [Parcels](./parcels.md)                 | Global libraries (coming soon...)                 |
| ----------- | ----------------------------- | --------------------------------------- | ------------------------------------------------- |
| SSR support | yes                           | no                                      | no                                                |
| Routing     | has multiple routes           | has no routes                           | has no routes                                     |
| API         | declarative API               | imperative API                          | exports a public interface                        |
| Renders UI  | renders UI                    | renders UI                              | may or may not render UI                          |
| Lifecycles  | ILC managed lifecycles        | custom managed lifecycles               | external module: no direct single-spa lifecycles  |
| When to use | core building block           | to embed part of the one App into other | useful to share common logic, or create a service |

Each ILC micro-frontend is an in-browser JavaScript module ([explanation](https://single-spa.js.org/docs/recommended-setup#in-browser-versus-build-time-modules)).


## Applications

Applications are registered in ILC Registry and their lifecycle (when and where it should appear) is fully managed by ILC 
based on the Routers and Templates configuration.

Applications act as a main building blocks for the website and can be rendered at the server side to enhance page loading timing and SEO/SMO metrics.

### Parcels in Applications
It's also important to mention that applications can export Parcels and so they can allow parts of their UI to be used in other apps.
See [Parcel documentation](./parcels.md) for more details.

## Parcels

Parcels exist primarily to allow you to reuse pieces of UI across applications when those applications are written in multiple frameworks.
Think of parcels as an ILC specific implementation of webcomponents. See [Parcel documentation](./parcels.md) for more details.

### Use case examples

#### Contacts modal

`App1` handles everything related to contacts (highly cohesive) but somewhere in `App2` we need to create a contact. 
We could do any number of things to share the functionality between application 1 and 2:

- If both are written in the same framework we could export/import components.
- We could reimplement creating a contact (loss of cohesion)
- We could use Parcels.

Exporting a parcel from `App1` that wraps the `createContact` modal component gives us the ability to share components 
and behavior across disparate frameworks, without losing application cohesion. 
`App1` can export a modal as _Parcel_ and `App2` can import the parcel and use it easily.