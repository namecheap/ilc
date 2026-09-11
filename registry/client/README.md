# UI for ILC Registry

## Quick start in dev mode

```bash
$ npm install
$ npm start
```

And then browse to [http://localhost:4001/](http://localhost:4001/).

The default credentials are:
**root / pwd** - for admin access.
**readonly / pwd** - for read only access.

## How to build/run

```bash
$ npm run build
$ npm run serve
```

## Configuration

You can configure protected admin settings using the `ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS` environment variable.  
Set this variable before starting the application to specify which settings should be blocked from editing in the admin UI.

Whole entities can be protected the same way using the `ILC_REGISTRY_ADMIN_PROTECTED_ENTITIES` environment variable (comma-separated entity types; supported: `apps`, `routes`, `special_routes`, `router_domains`, `shared_props`, `shared_libs`, `templates`, `auth_entities`).

`routes` covers regular routes only and `special_routes` covers the special ones (e.g. the 404 handlers), so routes registered by application deployments can stay editable while externally managed special routes are locked. Protection is UI-only: protected records get `protected: true` in API responses and lose their Edit button, while the REST API stays writable for external management pipelines.

Example:

```bash
export ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS="setting1,setting2"
export ILC_REGISTRY_ADMIN_PROTECTED_ENTITIES="router_domains,shared_props"
npm run dev
```

Or override it inside your custom custom Dockerfile:

```dockerfile
FROM namecheap/ilc_registry

ENV ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS="setting1,setting2"
```

Or provide it to the docker container itself.

# Parts of UI

- [Router domains](./docs/multi-domains.md)

## Router domain fields

| Field                | Description                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domainName`         | Hostname of the domain (e.g. `example.com`). Used by ILC at runtime to match incoming requests.                                                                                                                                  |
| `template500`        | Default 500 error template for this domain.                                                                                                                                                                                      |
| `canonicalDomain`    | Alternative domain used for canonical `<link>` tags.                                                                                                                                                                             |
| `brandId`            | Brand identifier for multi-brand setups.                                                                                                                                                                                         |
| `alias`              | Stable human-readable slug (e.g. `main-shop`). Allows routes to reference this domain by alias instead of numeric ID, which is useful when synchronizing route configuration across multiple ILC instances where IDs may differ. |
| `props` / `ssrProps` | Domain-level properties merged into all applications running on this domain.                                                                                                                                                     |
