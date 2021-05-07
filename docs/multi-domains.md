# Multi-domains

ILC can handle requests coming from multiple domains, so that you don't need to roll out individual instances of the ILC for every domain, you just can use one instance for all of them.  
If you are going to use ILC only with one domain name, then this document is useless for you now. But when you decide to kick off developing at least under one more domain, then we recommend you come back and follow the steps below.

## How to add a new domain name

1. Open ILC-Registry UI (at localhost by default it's run at http://localhost:4001/).

1. In the left sidebar menu choose **Router domains**. Here will be store a list of all domains which are used under your ILC instance.

1. Now we will add a new domain. At the top right corner, click **Create**.

    1. Enter your domain name in the **Domain name** field, e.g. "example.com".  
    **NB:** you should provide only domain name, without protocol, etc.  
    **NBB:** ILC uses a strict comparison of a domain name, which means if you enter "example.com" then sub-domains like "foo.example.com" won't work for you, so you should provide exactly "foo.example.com" in the **Domain name** field, if you are going to work with it.

    1. Choose the default **500** template in the **Templete of 500 error** field. We have a test route **/_ilc/500**, so you can check it now, just open in browser "https://your_domain.com/_ilc/500"  
    **NB:** it's better to create personal template to handle 500 errors per each of your domains.

1. Let's add the handler of the **404** error, to do it click on the **Routes** item in the left sidebar menu (you will be forwarded to this link).

1. At the top of the body click on **Show special**, to set the checkbox to active state. You will see a list of special routes (for now there are routes only for 404 pages).
**NB:** the 404 route without a specified domain name is can't be removed and is used as a fallback for all domains, so you can use one default 404 for all domains.

1. At the top right corner, click **Create special route** (you will be forwarded to this link).
    1. In the **Special role** field choose **404**;
    1. In the **Domain** field choose your domain;
    1. And other fields are the same as during the creation of simple routes.

1. Now everything is set up and you can create your first route. To do it:
Click again on **Show special** at the top of the body, to return to the list of simple routes;  
Off-topic: you can notice **Domain's** drop-down at the top of the body, with the help of it you can filter the list of domains, to work only with routes for a particular domain name.
    1. Then click **Create** at the top right corner
    1. During the creation of a route choose your domain name in the **Domain** field.
    1. If you need to move some old routes under newly created domain - just modify field **Domain** in their preferences.

1. Open the route created in the previous step in a browser, to check if everything works as expected.

## Additional information

- ILC detects domain from the **request.hostname** of Fastify and checks if we have this hostname in the list of **Router domains**.
  - [link to documentation of Fastify's **request**](https://www.fastify.io/docs/latest/Request/#request)
- Every registered domain in **Router domains** has it's own set of routes. They do not overlap.
- Domain is optional for routes, so if the request is going from the domain which is absent in **Router domains** - then routes w/o assigned domain will be used for routing.
