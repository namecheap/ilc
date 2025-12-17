ILC can handle requests from multiple domains so that you don't need to roll out individual instances of the ILC for every domain.

## Add a new domain name

1. Open the ILC Registry (http://localhost:4001/ by default).
1. In the sidebar, choose **Router domains**. This page stores a list of all domains that are used within the ILC instance.
1. In the top right corner, click **+ Create**.
1. On the new page, in the **Domain name** field, type your domain name. For example, `example.com`.

    !!! note ""
    Provide only domain name, without a protocol

    !!! warning ""
    ILC uses a strict comparison of a domain name, which means if you specify `example.com`, sub-domains like `foo.example.com` won't work. To include sub-domains, you need to specify `foo.example.com` or any other sub-domain that you are going to work with.

1. In the **Template of 500 error** field, choose the default **500** template.

    !!! note ""
    To test this route immediately, navigate to the https://your_domain.com/\_ilc/500 using your web browser.

    !!! hint ""
    It is recommended to create a personal template to handle 500 errors for each of your domains.

### Add error handler

1.  In the sidebar, choose **Routes**.
1.  In the top-left corner, enable the **Show special** toggle to see a list of special routes.

    !!! warning ""
    The 404 route without a specified domain is used as a fallback for all domains and cannot be deleted.

        You can use this route as a default for 404 errors for your domains.

1.  In the top right corner, click **+ Create special route**.

    **In the general tab:**

    1. In the **Special role** dropdown, select **404**.
    1. In the **Domain** dropdown, select your domain.

### Add a new route

1. In the top-left corner, disable the **Show special** toggle to see a list of simple routes.

    !!! hint ""
    You can use the **Domain** dropdown list to the right of the **Show special** toggle to filter the list of domains that allows you to work only with routes for a specific domain name.

1. In the top right corner, click **+ Create**.
1. On the new page, in the **Domain** field, type the domain name that you want to use for the new route.

    !!! hint ""
    If you need to move already existing routes under a newly created domain, modify the **Domain** field in their preferences.

1. Set other options according to your needs and click **Save**.
1. Navigate to the newly created route to check if everything works as expected.

## Domain-specific properties

Each Router Domain can have `props` and `ssrProps` configured. These properties are applied to all applications running on that domain.

### Configure domain properties

1. Open the ILC Registry and navigate to **Router domains**
2. Select an existing domain or click **+ Create** to add a new one
3. Click the **Domain Props** tab
4. Configure properties in the **Client Props** and **SSR Props** fields
5. Click **Save**

#### Client Props

Properties that will be passed to application.

**Example:**

```json
{
    "apiUrl": "https://api.example.com",
    "cdnUrl": "https://cdn.example.com",
    "timeout": 5000
}
```

#### SSR Props

Properties that will be added to main props at SSR request, allow to override certain values. These properties are never sent to the browser.

**Example:**

```json
{
    "internalApiUrl": "http://internal-api:3000",
    "apiUrl": "http://internal-api:3000"
}
```

In this example, `apiUrl` from SSR Props will override the Client Props `apiUrl` during server-side rendering, but the browser will still receive the original Client Props value.

### Properties merging

Properties from different levels are merged using deep merge. The merge order is:

1. Application props (highest priority)
2. Domain props
3. Shared props (lowest priority)

**Example:**

Shared props:

```json
{
    "apiUrl": "https://api.shared.com",
    "timeout": 3000
}
```

Domain props for `example.com`:

```json
{
    "apiUrl": "https://api.example.com"
}
```

App props:

```json
{
    "timeout": 5000
}
```

Merged result for apps on `example.com`:

```json
{
    "apiUrl": "https://api.example.com",
    "timeout": 5000
}
```

## Canonical domain

The canonical domain field specifies an alternative domain for canonical meta tags (`<link rel="canonical">`).

### Configure canonical domain

1. Open the ILC Registry and navigate to **Router domains**
2. Select a domain
3. In the **Canonical domain** field, enter the domain name (without protocol, e.g., `www.example.com`)
4. Click **Save**

### How it works

When canonical domain is set, ILC generates canonical tags using the canonical domain instead of the request domain.

**Without canonical domain:**

```html
<!-- Request: https://mirror.example.com/products -->
<link rel="canonical" href="https://mirror.example.com/products" />
```

**With canonical domain set to `www.example.com`:**

```html
<!-- Request: https://mirror.example.com/products -->
<link rel="canonical" href="https://www.example.com/products" />
```

### Interaction with route metadata

When both route `canonicalUrl` (in route metadata) and domain `canonicalDomain` are set, they combine:

-   Request: `https://mirror.example.com/products/variant-123`
-   Route metadata: `{ "canonicalUrl": "/products/main" }`
-   Canonical domain: `www.example.com`
-   Result: `https://www.example.com/products/main`

See [Route metadata canonicalUrl](routing/route_configuration.md#canonicalurl) for more information.

### Client-side behavior

ILC automatically updates canonical tags during client-side navigation.

## Additional information

-   ILC detects a domain from the [**request.host** of Fastify](https://www.fastify.io/docs/latest/Reference/Request/) and checks whether this hostname is listed in the **Router domains**.
-   Each registered domain in the **Router domains** has its own set of routes that do not overlap.
-   For routes, the domain is optional. If the request goes from the domain that is not listed in the **Router domains**, the routes for the request will stay unassigned.
