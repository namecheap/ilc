# ILC Registry

The registry provides a Rest API and UI to publish, update, and retrieve micro frontends, templates and
routes configuration. 

It's available at `4001` port by default (use http://127.0.0.1:4001 for locally launched ILC).

## Authentication / Authorization

Currently Registry supports authentication only, all authenticated entities will receive all permissions possible.

As for now we support 2 authentication providers:

- Locally configured login/password. **Default credentials:** root / pwd
- Locally configured Bearer token for API machine-to-machine access. 
**Default credentials:** `Bearer cm9vdF9hcGlfdG9rZW4=:dG9rZW5fc2VjcmV0` (after base64 decode it's `Bearer root_api_token:token_secret`).

Default credentials can be changed by editing data in `auth_entities` table. No API is available for now.

To correctly hash password before inserting it into DB you can use https://passwordhashing.com/BCrypt

## User Interface

![UI demo](./assets/registry_ui.gif)

## API

Currently there is no documentation for each API endpoint. However you can use network tab to see how UI
communicates with API or feel free to explore code starting from here `/registry/server/app.ts` 