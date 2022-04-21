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
        To test this route immediately, navigate to the https://your_domain.com/_ilc/500 using your web browser.

    !!! hint ""
        It is recommended to create a personal template to handle 500 errors for each of your domains.

### Add error handler

1. In the sidebar, choose **Routes**.
1. In the top-left corner, enable the **Show special** toggle to see a list of special routes.

    !!! warning ""
        The 404 route without a specified domain is used as a fallback for all domains and cannot be deleted.
        
        You can use this route as a default for 404 errors for your domains.

1. In the top right corner, click **+ Create special route**.
    
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

## Additional information

- ILC detects a domain from the [**request.hostname** of Fastify](https://www.fastify.io/docs/latest/Reference/Request/) and checks whether this hostname is listed in the **Router domains**.
- Each registered domain in the **Router domains** has its own set of routes that do not overlap.
- For routes, the domain is optional. If the request goes from the domain that is not listed in the **Router domains**, the routes for the request will stay unassigned.
