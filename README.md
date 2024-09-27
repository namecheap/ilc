![Isomorphic Layout Composer logo](brand/cover_small.png)

----

[![Latest version](https://badgen.net/github/tag/namecheap/ilc?label=Latest%20version&color=green&cache=900)](https://github.com/namecheap/ilc/releases)
[![Demo website](./docs/assets/demo-website.svg)](http://ilc-demo.namecheap.technology)
[![Actions Status](https://github.com/namecheap/ilc/workflows/CI/badge.svg)](https://github.com/namecheap/ilc/actions)
[![Docker Pulls](https://badgen.net/docker/pulls/namecheap/ilc?icon=docker&label=ILC%20pulls)](https://hub.docker.com/r/namecheap/ilc)
[![Docker Pulls](https://badgen.net/docker/pulls/namecheap/ilc_registry?icon=docker&label=ILC%20registry%20pulls)](https://hub.docker.com/r/namecheap/ilc_registry)

Isomorphic Layout Composer (ILC) - a layout service that composes a web page from fragment services.
It supports client/server-based page composition.

Its competitive advantage over other solutions is an *isomorphic* page composition.
It means that ILC assembles a page on the server-side using apps that support Server-side rendering (SSR), and after that,
the page is passed on the client-side, so the client-side rendering handles all further navigation.

This approach allows to **combine advantages of the
[Micro Frontends](https://martinfowler.com/articles/micro-frontends.html),
[SPA](https://en.wikipedia.org/wiki/Single-page_application), and
[Server-side rendering](https://developers.google.com/web/updates/2019/02/rendering-on-the-web#server-rendering) approaches**.

This repository also contains an example of how you can create a frontend that is composed from multiple
applications that work in concert and deliver a unified experience.

## Why do I need ILC?

Microservices get a lot of traction these days. They allow multiple teams to work independently, choose
their technology stacks, and establish release cycles. Unfortunately, frontend development doesn't take full advantage
of the microservices' benefits. The common practice for building websites is still "a monolith" - a single frontend codebase
that consumes multiple APIs.

What if we introduce microservices on the frontend? It would allow frontend developers to work together with their backend
counterparts on the same feature and independently deploy parts of the website ("fragments"), such as header, product, and footer.
To bring microservices to the frontend, you need a layout service that can "stitch" a website out of fragments.
This is where ILC comes into play.

## Key features

* 📦 **Based on [single-spa](https://single-spa.js.org/) and [TailorX](https://github.com/StyleT/tailorx)** - battle-tested solutions inside.
* 📱 **Technology-agnostic** - use it with React, Vue.js, Angular, etc.
* ⚙️ **Server-side rendering (SSR) support** - key advantage over competitors.
* 🗄 **[Built-in registry](./docs/registry.md)** - add new apps, pages, or change configs and templates in a few clicks.
* ⚡️ **Built for speed** - server-side part of the system adds just ~17ms of latency
* 👨‍💻 **[Develop in production](./docs/develop_in_production.md)**
* 🌐 **[Internationalization support](./docs/i18n.md)** - serve your clients from any country. [Demo with a localized navbar](http://ilc-demo.namecheap.technology/ua/)
* 📡 **Advanced features:**
    * [Parcels](./docs/parcels.md)
    * [Plugins](https://github.com/namecheap/ilc-plugins-sdk)
    * [App Wrappers](./docs/app_wrappers.md)
* 💲 **Backed by [Namecheap](https://www.namecheap.com/about/mission-vision-values/)** - we use it internally and plan to evolve it together with the community.

## 🚀 Quick start

!!! tip "Demo website"
    For a quick preview, check out our [demo website](http://ilc-demo.namecheap.technology/)

To quickstart with ILC locally, follow the steps below:

1. Clone the [namecheap/ilc](https://github.com/namecheap/ilc/) repository.
1. Run `npm install`
    1. **OPTIONAL** Switch database to PostgreSQL by changing environment variable `DB_CLIENT` to `pg` in services `registry_worker` and `registry` 
1. Run `docker compose up -d`. Wait for the process to complete:

    ```
    [+] Running 6/6
     ⠿ Network ilc_default                  Created     0.1s
     ⠿ Container ilc-ilc-1                  Started     0.8s
     ⠿ Container ilc-mysql-1                Started     0.8s
     ⠿ Container ilc-registry-1             Started     20.0s
     ⠿ Container ilc-demo-apps-1            Started     1.4s
     ⠿ Container ilc-registry_worker-1      Started     19.8s
    ```

1. Run `docker compose run registry npm run seed`. Wait for the process to complete:

    ```sh
    [+] Running 1/1
     ⠿ Container ilc-mysql-1                Recreated   3.8s
    [+] Running 1/1
     ⠿ Container ilc-mysql-1                Started     0.4s

    > registry@1.0.0 seed /codebase
    > knex --knexfile config/knexfile.ts seed:run

    Requiring external module ts-node/register
    Working directory changed to /codebase/config
    WARNING: NODE_ENV value of 'production' did not match any deployment config file names.
    WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode
    Ran 8 seed files
    ```

1. Open your browser and navigate to ILC or Registry UI:
    * `ILC`: http://localhost:8233/
    * `Registry UI`: http://localhost:4001/ (user: `root`, password: `pwd`)

!!! tip "Additional commands"
    * View logs: `docker compose logs -f --tail=10`
    * Shutdown local ILC: `docker compose down`

!!! note ""
    You can find more information about demo applications for this quick start [in the namecheap/ilc-demo-apps](https://github.com/namecheap/ilc-demo-apps) repository.

## Architecture overview

![ILC Architecture overview](docs/assets/ILC-Architecture.svg)

## Repository structure

The `namecheap/ilc` repository consists of the following parts:

* `ilc`: code of the Isomorphic Layout Composer
* `registry`: app that contains configuration that ILC uses: a list of micro-fragments, routes, etc.

## Further reading

* [Overview](./docs/overview.md)
* [Micro-frontend Types](./docs/microfrontend-types.md)
* [Step-By-Step lessons about apps development with ILC](./docs/how-to-guides/index.md)
* [ILC to App interface](https://namecheap.github.io/ilc-sdk/pages/Pages/ilc_app_interface.html)
* [ILC Registry](./docs/registry.md)
* [Animation during reroute](./docs/animation_during_reroute.md)
* [Global error handling](./docs/global_error_handling.md)
* [Demo applications used in quick start](https://github.com/namecheap/ilc-demo-apps)
* [SDK for ILC plugins development](https://github.com/namecheap/ilc-plugins-sdk)
* [Compatibility with legacy UMD bundles](./docs/umd_bundles_compatibility.md)
* [Global API](https://namecheap.github.io/ilc-sdk/pages/Pages/global_api.html)
* [ILC transition hooks](./docs/transition_hooks.md)
* [Multi-domains](./docs/multi-domains.md)
* [Public Path Problem](https://namecheap.github.io/ilc-sdk/pages/Pages/public_path.html)

## 🔌 Adapters

ILC relies on the adapters provided within the [single-spa ecosystem](https://single-spa.js.org/docs/ecosystem) to connect various frameworks. However, to ensure better integration with ILC, some of the original adapters were extended:

* [React - ilc-adapter-react](https://github.com/namecheap/ilc-adapter-react)
* [Vue.js - ilc-adapter-vue](https://github.com/namecheap/ilc-adapter-vue)

## Notes

### `@portal/` prefix

ILC uses webpack (a static module bundler) to build each application for our micro-frontend approach. Webpack requires
access to everything it needs to include in the bundle at build time. It means when an app imports a service (for example, planets import the fetchWithCache service), webpack tries to bundle the service into the planets bundle.

The built-in way to prevent this behavior is [webpack externals](https://webpack.js.org/configuration/externals/).
This approach works well but to avoid adding a regex to each service ILC uses the `@portal` prefix to instruct both webpack and developers that the import is another micro-app/service/frontend.

### Code splitting

[Code splitting](https://webpack.js.org/guides/code-splitting/) is a complicated topic. In ILC, code splitting is even more complicated. The reason is that the webpack module format expects the loading of extra modules from the website root, which will always fail until a place from where to load extra modules is configured.
In ILC, you can see an example of this approach in the [demo people application](https://github.com/namecheap/ilc-demo-apps/blob/master/apps/people/src/people.js#L9).


### Sockets timeout to fragments

If you experience socket timeouts during requests to fragments, plese checkout this workaround https://github.com/namecheap/ilc/issues/444
