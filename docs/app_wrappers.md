# Wrapper for applications

## Overview

!!! warning ""
    This is an advanced feature of ILC. In most cases, you won't need it.

Application wrapper is useful when you want to extract some bootstrap, loading or authorization functionality from different applications, and control them from a single place.

For example, if you are building a store where product pages are developed by different teams. As a result, these pages will reside on different Micro Frontends. In this case, the business logic that checks whether the product has already been purchased by the customer can be extracted into a standalone application. This application would perform the check and render the corresponding UI for purchase, if necessary.

## High-level diagram

![App Wrappers Diagram](./assets/app_wrappers_diagram.svg)

## Registry configuration

To use this feature, you need to configure the ILC Registry as follows:

1. For the registered App Wrapper application, set the `kind` property to `wrapper`.
1. For the applications that you want to wrap with Wrapper, set `wrappedWith` property according to the name of the application, registered in the previous step.

!!! warning ""

    - You cannot use applications with `kind = wrapper` in routes directly.
    - If you need to wrap applications with SSR, make sure that the Wrapper (new or existing one) supports SSR as well. Otherwise, SSR support will be ignored for all wrapped applications.


## Build App Wrapper

Essentially App Wrapper is a regular ILC application that receives extra property to allow the rendering of the target application 
with additional properties when needed.

Check the [demo wrapper for reference implementation](https://github.com/namecheap/ilc-demo-apps/tree/master/apps/wrapper){: target=_blank} :octicons-link-external-16:

### Client-side API

On the client-side, Wrapper App receives an additional `renderApp` property via [ILC to App interface](https://namecheap.github.io/ilc-sdk/pages/Pages/ilc_app_interface.html){: target=_blank} :octicons-link-external-16:

### Server-side API

On the server-side, an application should use [IlcAppWrapperSdk](https://namecheap.github.io/ilc-sdk/classes/_server_ilcappwrappersdk_.ilcappwrappersdk.html){: target=_blank} :octicons-link-external-16:
from [ilc-sdk](https://github.com/namecheap/ilc-sdk) instead of the regular [IlcSdk](https://namecheap.github.io/ilc-sdk/classes/_server_ilcsdk_.ilcsdk.html){: target=_blank} :octicons-link-external-16: class

It exposes an additional `forwardRequest` method that can be used to forward SSR request to the target application and render it 
immediately on the client-side without executing App Wrapper's code during the initial CSR on page load.
