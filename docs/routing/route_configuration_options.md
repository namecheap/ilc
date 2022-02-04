# Route configuration options

## Route domains

ILC can handle requests coming from multiple domains, so you can use a single ILC instance to handle them instead of rolling out individual instances for every domain.

ILC checks the exact match of domain names. It means that `secure.example.com` is not equal to `example.com`, and you may need to add the necessary subdomains to handle this case properly.

![ILC registry domains field](../assets/routes/domain-field.png)

!!! note ""
    - Domain name must be without protocol.
    - Empty `Domain Name` field means the main app domain.
    - To add a new domain, go to the **Router domains** section in the sidebar.
        
        ??? tip "Add a new domain"
            ![ILC registry domains menu](../assets/routes/domain-create.png)

!!! note ""
    ILC renders applications for only one domain at the same time. To add one header to several domains, you need to create the same route several times specifying the required domain for each route.

    For example:

    ![ILC registry domains example](../assets/routes/domain-example.png)

    where:

    * :fontawesome-solid-square:{ .color-green } - render for the main domain
    * :fontawesome-solid-square:{ .color-red } - render for the `127.0.0.1` domain only

More information about domains is available in the [Multi-domains page](../multi-domains.md).

## Route template

Template is an HTML file that is used to build the structure of your page. If it is missing in the routing chain, ILC won't be able to render your content properly and will throw an error.

![ILC registry template field](../assets/routes/template-field.png)

!!! warning "Important note"
    There must be at least one template in the routing chain.

To create a template, go to the **Templates** section in the sidebar.

![ILC registry template menu](../assets/routes/template-create.png)

## Route metadata

Metadata is used to determine whether the page should be protected. If yes, access to the protected page will be granted only after the user fulfills the required conditions.

### Supported options

- `protected`. Type: `boolean`
    
    ![Route meta field in ILC registry](../assets/route_meta_field.gif)

### Access the protected page

In the basic scenario, the required condition to access the protected page is to press the `confirm` button. In real world scenarios, you can set any conditions (for example, authorization form).

![ILC transition hooks](../assets/transition_hooks.gif)

More information about protected route is available in the [ILC transition hooks page](../transition_hooks.md).

## Slot configuration

Slot configuration defines the main settings of a route:

- application;
- where the application should be displayed;
- how critical this application is for our siteъ
- create/change application properties

![ILC slot configuration](../assets/routes/slot-configuration1.png)
![ILC slot configuration](../assets/routes/slot-configuration2.png)

### Configuration

1. **Slot name**
    
    Slot name refers to the value of the `id` attribute of the corresponding `ilc-slot` in the ILC templates. Your application will be rendered inside the `ilc-slot` with the `id` that you specify in the `Slot name`.

    ```html
    </head>
     <body>
       <ilc-slot id="navbar" />
       <ilc-slot id="body" />
       <ilc-slot id="footer" />
     </body>
     </html>
    ```

    !!! warning "Important note"
        You can have only one application per slot. If you add multiple applications to one slot, only the latter one will be rendered.

1. **App name**

    App name refers to the application that will be rendered in the specified slot. Applications in the list are defined in the `Apps` section in the sidebar.

1. **App type**

     There are the following app types:
     
     - **Primary**: set for the vital applications of your **site**. If the application crashes on the server side, ILC won't render it on the client side, and will immediately render an error.
     - **Essential**: set for the vital applications for the **user** (for example, header). If the application crashes on the server side, ILC will try to render it on the client side. It will render an error only if the application crashes on both server and client sides.
     - **Regular**: set for non-critical applications (for example, footer). If the application crashes on both server and client sides, ILC won't render it on the client side and will ignore errors from it.

1. **Props field**

     Props allow you to configure the application separately for each route. With props, you can override the props specified when creating the application in the **Apps** section in the sidebar.
