# ILC Registry

The registry provides a Rest API and UI to publish, update, and retrieve micro frontends, templates and
routes configuration. 

It's available at `4001` port by default (use http://127.0.0.1:4001 for locally launched ILC).

## Authentication / Authorization

Currently Registry supports authentication only, all authenticated entities will receive all permissions possible.

As for now we support 3 authentication providers:

- OpenID Connect. **Turned off by default.**
- Locally configured login/password. **Default credentials:** root / pwd
- Locally configured Bearer token for API machine-to-machine access. 
**Default credentials:** `Bearer cm9vdF9hcGlfdG9rZW4=:dG9rZW5fc2VjcmV0` (after base64 decode it's `Bearer root_api_token:token_secret`).

Default credentials can be changed via "Auth entities" page through UI (or via API).

### OpenID Configuration

See `auth.openid.*` keys at "Settings" page in Registry to configure OpenID.

Sample configuration (_note that values are JSON encoded_):

| key | value |
|---|---|
|`baseUrl`| `"https://ilc-registry.example.com/"`|
|`auth.openid.enabled`| `true`|
|`auth.openid.discoveryUrl`| `"https://adfs.example.com/adfs/"`|
|`auth.openid.clientId`| `"ba34c345-e543-6554-b0be-3e1097ddd32d"`|
|`auth.openid.clientSecret`| `"XXXXXX"`|

> Attention:
  OpenID Connect returnURL should be specified at provider as follows: `{baseUrl}/auth/openid/return`

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