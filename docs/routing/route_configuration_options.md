# Route configuration options

## Route domains

![ILC registry domains field](../assets/domain-field.png)

- Yoc can add new domain in **Router domains** menu.

- Domain name, must be without protocol, etc.

 ![ILC registry domains menu](../assets/router-domain.png)

 - Empty `Domain Name` field is equal to main app domain.

 - The application renders only one domain at the same time, so in order to add one header to several different domains, you need to create a route several times specifying the required domain for each.

 **For example:**

 ![ILC registry domains example](../assets/domain-example.png)
 ![color box](../assets/green-box.png) - render for main domain.
 ![color box](../assets/red-box.png) - render only for `127.0.0.1` domain.