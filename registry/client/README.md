# UI for ILC Registry

## Quick start in dev mode

```bash
$ npm install
$ npm start
```

And then browse to [http://localhost:8080/](http://localhost:8080/).

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

Example:

```bash
export ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS="setting1,setting2"
npm run dev
```

Or override it inside your custom custom Dockerfile:

```dockerfile
FROM namecheap/ilc_registry

ENV ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS="setting1,setting2"
```

Or provide it to the docker container itself.

# Parts of UI

-   [Router domains](./docs/multi-domains.md)
