# Installing Isomorphic Layout Composer

Production grade installation of the ILC consists from the deployment of 2 Docker images 
([ILC](https://hub.docker.com/r/namecheap/ilc) & [ILC Registry](https://hub.docker.com/r/namecheap/ilc_registry)) 
and 1 MySQL (5.7+) DB. 

It's recommended to use semver Docker tags (such as `1.1.0`) to pin it to exact version of the image.

In order to upgrade ILC to higher version you only need to replace running Docker images with a new version 
in the following order: Registry first, ILC itself after. 
So you should never have newer version of ILC running alongside outdated Registry. 

To get more information about exact configuration of the Docker images see [docker-compose.yml]({{ repo.full_url }}/docker-compose.yml){: target=_blank} :octicons-link-external-16:

## Environment variables

While most of the settings that are available in ILC are configurable through Registry UI or API there are certain system
parameters that can be configured only via environment variables passed to Docker container.

You can find full list of them in the following files:

* [ILC container]({{ repo.full_url }}/ilc/config/custom-environment-variables.json5){: target=_blank} :octicons-link-external-16:
* [Registry container]({{ repo.full_url }}/registry/config/custom-environment-variables.ts){: target=_blank} :octicons-link-external-16:

## Authentication credentials configuration

As soon as you'll get ILC up and running it's crucial to remove default access credentials and configure your own.
See [Registry: Authentication / Authorization](./registry.md#authentication-authorization) doc for more details.

## High availability

In order to deploy ILC in HA fashion you need to keep at least 2 instances of ILC, 2 of Registry and deploy MySQL in cluster mode (e.g. via AWS RDS Multi-AZ).

It's worth to mention that ILC implements aggressive caching of the data from Registry so it can work for some time event w/o 
ability to communicate with Registry. Low response latency from Registry are also not really necessary for the same reason.


## Backup & restore

ILC stores all user data in Registry DB. So regular MySQL backup/restore practices can be applied here. 
No special actions needed.

## Performance analytics with NewRelic

ILC supports integration with [NewRelic APM](https://newrelic.com/products/application-monitoring), 
[NewRelic Browser](https://newrelic.com/products/browser-monitoring) and send custom metric to 
[NewRelic Insights](https://newrelic.com/products/insights). 
 
To turn it on you need to pass your NewRelic license key in `NR_LICENSE_KEY` env variable to ILC & Registry containers.

You can also wrap JS code that NR will generate if you have NewRelic Browser product enabled via `NR_CUSTOM_CLIENT_JS_WRAPPER`
env variable. This may be useful for the compliance with GDPR customer settings. Example of usage:
```html
<script type="text/javascript">(function mygdprWrapper(){ %CONTENT% })()</script>`
```

Custom metrics sent to Insights:
* PageAction with Action Name `routeChange`. It contains duration of the reroute in ms.