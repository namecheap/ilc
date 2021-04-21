# UI for ILC Registry

## Quick start in dev mode

```bash
$ npm install
$ npm start
```

And then browse to [http://localhost:8080/](http://localhost:8080/).

The default credentials are: **root / pwd**

## How to build/run

```bash
$ npm run build
$ npm run serve
```


# Parts of UI
## Router domains
*NB If you use ILC only for one domain name then "Router domains" is unnecessary for you.*

ILC supports multi-domains, it means you can use one instance of ILC and Registry for a few domains.
To use it:
- Go to **Router domains** page and create new entities (you can choose default "**500**" template for your domains or create new templates for each of them).
- Choose domain name during creation a new route or update field "**Domain**" in your existed routes.