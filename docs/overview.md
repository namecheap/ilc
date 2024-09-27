# ILC setup overview

## ILC instance

Production-grade ILC installation includes deployment of 3 Docker images:

1. [ILC](https://hub.docker.com/r/namecheap/ilc)
1. [ILC Registry](https://hub.docker.com/r/namecheap/ilc_registry)
1. MySQL database (version 5.7+).

!!! tip ""
    We recommend using semver Docker tags (such as `1.1.0`) to pin it to the exact version of the image.

    To get more information about exact configuration of the Docker images see [docker-compose.yml]({{ repo.full_url }}/docker-compose.yml){: target=_blank} :octicons-link-external-16:

### ILC upgrade

To upgrade ILC to a higher version, you need to replace running Docker images with a new version in the following order: Registry, ILC.
In this way, you will always have a new version of ILC running alongside the up-to-date Registry.

## Environment variables

In ILC, most of the settings are configurable via Registry UI or API. There is also a set of system parameters that can only be configured via environment variables passed to the Docker container.

Check the full list of these parameters in the following files:

* [ILC container]({{ repo.full_url }}/ilc/config/custom-environment-variables.json5){: target=_blank} :octicons-link-external-16:
* [Registry container]({{ repo.full_url }}/registry/config/custom-environment-variables.ts){: target=_blank} :octicons-link-external-16:

## Authentication credentials configuration

Once you get ILC up and running, you must remove default access credentials and configure your own. Check the
[Registry: Authentication / Authorization](./registry.md#authentication-and-authorization) document for more details.

## High availability (HA)

To deploy ILC in HA fashion, you need to keep at least two instances of both ILC and Registry and deploy MySQL in cluster mode (for example, via AWS RDS Multi-AZ).

ILC uses aggressive caching of the data from the Registry, so it does not require a permanent connection to the Registry or a low latency response from the Registry.

## Backup and restore

As ILC stores all user data in the Registry DB, you can use regular MySQL backup/restore practices.

## Performance analytics with NewRelic

ILC supports integration with [NewRelic APM](https://newrelic.com/products/application-monitoring) and [NewRelic Browser](https://newrelic.com/products/browser-monitoring). It can also send custom metric to [NewRelic Insights](https://newrelic.com/products/insights).

To enable the integration, you need to pass your NewRelic license key in `NR_LICENSE_KEY` environmental variable to ILC and Registry containers.

If you have the NewRelic Browser enabled, you can wrap JavaScript code that NewRelic generates using the `NR_CUSTOM_CLIENT_JS_WRAPPER`
environmental variable. This approach may be useful for compliance with GDPR customer settings.

For example:

```html
<script type="text/javascript">(function mygdprWrapper(){ %CONTENT% })()</script>`
```

Custom metrics sent to Insights:

* PageAction with Action Name `routeChange`. It contains the duration of the reroute in miliseconds.
