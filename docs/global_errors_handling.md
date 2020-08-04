# Global error handling with ILC

Introduction of Micro Frontends architecture brings new challenges to the board that need to be solved. One of those challenges is handling of the 5XX & 4XX error pages. As your web page now is composed from several fragments you can't use the same approach you used to have with monolithic frontend. This is the moment when ILC comes to the stage.

Types of the apps
-----------------

- **Primary** - app which is "responsible" for the current route, usually this app renders main consumable page content. At a particular route you may have only a single primary app. During SSR this app will supply HTTP response code & headers in the response to the client.

- **Essential** - app which is treated as an essential part of the page. Should be applied only to the ones w/o which page makes no sense to the user. Typical example is a website header.

- **Regular** - app which provides supplementary functionality on the page. Page can be effectively consumed by users w/o such apps rendered. Example: footer, ads, promo banners

"5XX" errors (unexpected errors)
--------------------------------

Handling of the unexpected errors varies between SSR & CSR (as well it depends on the type of the app) due to the natural differences between server & client. So keep an eye on it.

It's also worth saying that there is no such thing as 5XX error at the client side. However we use this term at the client side as well to simplify & unify things a bit.

- **Primary apps**
    - _SSR:_ _all 5XX response codes_ will trigger appearance of the 500 error page configured in ILC
    - _CSR:_ any error caught by ILC errorHander or errors during loading/mounting - will trigger appearance of the 500 error page configured in ILC

- **Essential apps**
    - _SSR:_ _all non 2XX response codes_ will be treated as SSR error and 2nd rendering attempt will be done at client side.\
    However if we handle request from SEO/SM bot - 500 error page configured in ILC will be shown.
    - _CSR:_ any error caught by ILC errorHander or errors during loading/mounting - will trigger appearance of the 500 error page configured in ILC

- **Regular**
    - _SSR:_ _all non 2XX response codes_ will be treated as SSR error and 2nd rendering attempt will be done at client side.
    - _CSR:_ any error caught by ILC errorHander or errors during loading/mounting - will be logged w/o any further actions


"404" error (Not found)
-----------------------

This is a very common error in web applications & usually it means that we want to show some message to the user that requested resource was not found on the server.

With the introduction of the micro frontends & global ILC router things become a little bit trickier. It means that we may catch this error at 2 different routing layers:

- **ILC Router** – if there is no route configured in Registry for requested URL - it will trigger an appearance of the special 404 route ([Namecheap example](https://www.namecheap.com/status/404.aspx)). This logic will work seamlessly between SSR & CSR.
    
    Ex: `/nosuchpath` url was requested. Or try <http://demo.microfrontends.online/nosuchpath>

- **App Router** – (_only for primary apps_) there also may be cases when we have a route configured in Registry, however the app which is responsible for the page - fails to find the requested resource by it's ID. Imagine that you're trying to open a page of the non-existing product. Here there are 2 ways for the app to handle this case:
    - _Fallback to global 404 page_ - recommended approach, in this case app's content will be abandoned and users will see content of the special 404 route. To do this at CSR/SSR do the following:
        - _SSR:_ respond with 404 HTTP code
        - _CSR:_ trigger `ilc:404` event on window with the following parameters:
            - `appId` - application ID that was passed by ILC to the app

    - _App specific 404 page_ - use this only if you need to show some custom UI. To do this at CSR/SSR do the following:
        - _SSR:_ respond with 404 HTTP code & `X-ILC-Override: error-page-content` response header
        - _CSR:_ render custom UI you need w/o firing any events



"401" & "403" errors (Unauthorized / Forbidden)
-----------------------

Сurrently ILC has no special logic in place. May be reconsidered in the future.