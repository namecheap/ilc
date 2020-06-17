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


## Update of the JS/CSS URLs during micro-frontends deployment

It's a usual pattern to store JS/CSS files of the micro-frontend apps at CDN using unique URLs 
(ex: `https://nc-img.com/layoutfragments-ui/app.80de7d4e36eae32662d2.js`). While following this approach we need to update 
links to the JS/CSS bundles in registry after every deployment.

To do so we have at least 3 options:
* Manually via UI (_not recommended_)
* Using Registry API (see API endpoints for more info)
* **Using App Assets Discovery mechanism**

While registering micro-frontend in _ILC Registry_ it's possible to set "Assets discovery url" which will be examined periodically 
by Registry. The idea is that this file will contain actual references to the JS/CSS bundles and updated at CDN **right after** every deploy.

Example file: 
```json5
// https://nc-img.com/layoutfragments-ui/assets-discovery.json
{
  "spaBundle": "https://nc-img.com/layoutfragments-ui/app.80de7d4e36eae32662d2.js",
  "cssBundle": "./app.81340a47f3122508fd76.css", //It's possible to use relative links which will be resolved against manifest URL
  "dependencies": {
    "react": "https://unpkg.com/react@16.13.1/umd/react.production.min.js"
  }
}
```