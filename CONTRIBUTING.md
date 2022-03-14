# Contribution guide

:octicons-heart-fill-24:{ .color-red } Thank you for your interest in making ILC better. Your contributions are highly welcome.

## Install and setup LDE

1. Clone the [namecheap/ilc](https://github.com/namecheap/ilc/) repository.
1. (_For internal employees only_): Clone the [ilc.internal](https://git.namecheap.net/projects/RND/repos/ilc.internal/browse) repository
    1. Follow the guide inside the repository to setup NC-specific applications.
1. Run `npm install`
1. Run `npm start`
1. Open your browser and navigate to ILC or Registry UI:
    * `ILC`: http://localhost:8233/
    * `Registry UI`: http://localhost:4001/

!!! tip "Dev mode for demo applications"
    With the commands above, you start ILC with a [set of demo applications](https://github.com/namecheap/ilc-demo-apps) running inside the Docker container. It is OK when you work with ILC. However, when you need to develop those applications alongside ILC, you should switch them into dev mode.

    To switch demo applications into dev mode:

    1. Clone the [ilc-demo-apps](https://github.com/namecheap/ilc-demo-apps)
    1. Open a new Terminal instance (alongside the running one with ILC).
    1. Run `npm run start:no-apps`

## Run E2E tests

We use E2E tests to ensure that all ILC components work together properly.

We use our Demo applications as a test platform for micro-frontends and also to ensure that backward compatibility is not broken.

To run E2E tests:

1. Build ILC and Registry: `npm run build`
1. Change your current directory to `./e2e`
1. Launch one of the following commands:
    * Default mode: `npm start`
    * Verbose mode: `npm run start:verbose`
    * Verbose mode with Browser UI visible: `npm run start:verbose:ui`

## Debug mode

ILC uses the [debug](https://www.npmjs.com/package/debug) package on the client-side to produce verbose logs for debug purposes.

To enable it, type `localStorage.debug = 'ILC:*'` in your browser console.

## Watch and build documentation

1. Build a Docker image: `docker build -t ilc-mkdocs - < ./.mkdocs/Dockerfile`
1. Watch or build documentation:
    * Watch: `docker run --rm -it -p 8000:8000 -v ${PWD}:/docs ilc-mkdocs`
    * Build: `docker run --rm -v ${PWD}:/docs ilc-mkdocs build`
