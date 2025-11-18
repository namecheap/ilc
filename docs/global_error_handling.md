# Global error handling

In the micro frontends architecture, handling errors (such as 5xx and 4xx) is a challenge because the common approach that is used for the monolithic frontend does not work here. This page describes how error handling is implemented in ILC.

## App types

- **Primary**: an app that is responsible for the current route. Typically, this app renders the main consumable page content. You can have only one primary app for a particular route. During SSR, this app supplies HTTP response codes and headers to the client.
- **Essential**: an app that is treated as an essential part of a page. Typically, these are apps without which a page makes no sense to the user. For example, a website header.
- **Regular**: an app that provides extra functionality on a page. Typically, these apps do not impact the content, and users can consume a page even without these apps. For example, footer, ads, promo banners.

## 5xx errors (unexpected errors)

Handling of the unexpected errors varies between Server-side rendering (SSR) and Client-side rendering (CSR). It also depends on the type of app.

!!! note ""
    There are no 5xx errors on the client-side. In ILC, this term is used for consistency and simplicity.

### Primary apps

- **SSR**: _all 5xx response codes_ trigger the 500 error page configured in ILC.
- **CSR**: any error caught by ILC errorHander, or errors during loading/mounting trigger the 500 error page configured in ILC.

### Essential apps

- **SSR**: _all non-2xx response codes_ are treated as SSR error and the second rendering attempt will be done on the client-side.
    
    !!! warning ""
        If you handle requests from SEO/SM bot, the 500 error page configured in ILC will be displayed.

- **CSR**: any error caught by ILC errorHander, or errors during loading/mounting trigger the 500 error page configured in ILC.

### Regular

- **SSR**: _all non-2xx response codes_ are treated as SSR error and the second rendering attempt will be done on the client-side.
- **CSR**: any error caught by ILC errorHander, or errors during loading/mounting are logged without any further action.

## 404 error (Not found)

!!! info ""
    This is a common error in web applications that shows a message to the user when the requested resource was not found on the server.

In ILC, this error can be caught in two different routing layers:

1. **ILC Router**: if there is no route configured in the Registry for the requested URL. This will trigger the special 404 route ([Namecheap example](https://www.namecheap.com/status/404.aspx){: target=_blank} :octicons-link-external-16:). This logic works seamlessly between SSR and CSR.

    !!! example "404 error example"
        `/nosuchpath` URL was requested. Navigate to [localhost:8233/nosuchpath](http://localhost:8233/nosuchpath){: target=_blank} :octicons-link-external-16: to see this error.

- **App Router**: (for primary apps only) if an app that is responsible for the page fails to find the requested resource by its ID even when the route is configured in the Registry. For example, when you're trying to open a page of a non-existing product.

    There are the following ways for an app to handle this case:

    - **Fallback to global 404 page**: (**recommended approach**) an app's content is abandoned and users will see the content of the special 404 route.
    
        ??? example "How to fallback to global 404 page on SSR/CSR"

            - **SSR**: respond with 404 HTTP code.
            - **CSR**: trigger `ilc:404` event on the window with the following parameter:
                - `appId`: application ID that was passed by ILC to the app.

    - **App-specific 404 page**: use this approach only if you need to show a custom UI.

        ??? example "How to show an app-specific 404 page on SSR/CSR"

            - **SSR**: respond with: 404 HTTP code and `X-ILC-Override: error-page-content` response header.
            - **CSR**: render the custom UI that you need without triggering events.

## 401 (Unauthorized) and 403 (Forbidden) errors

Сurrently, ILC has no specific logic for these error types. However, this may be reconsidered in the future.
