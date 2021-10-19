# Contributing to Isomorphic Layout Composer

**Thank you for your interest in making ILC even better and more awesome. Your contributions are highly welcome.**

## Installation and setup of the LDE
1. Clone the repo
1. _For Namecheap employees only_: clone 
"[ilc.internal](https://git.namecheap.net/projects/RND/repos/ilc.internal/browse)" 
repo and follow the guide to setup NC specific applications.
1. Run `npm install`
1. Run `npm start`
1. PROFIT 😎
    * Open running code at `http://localhost:8233/`
    * Registry UI is available at `http://localhost:4001/`
    
These steps will start ILC with a [set of demo applications](https://github.com/namecheap/ilc-demo-apps) running inside
Docker container. While it's ok in most of the cases - sometimes you might need to develop those apps alongside ILC.

To do so you need to clone [ilc-demo-apps](https://github.com/namecheap/ilc-demo-apps) repo and run them in dev mode.
At the same time in parallel terminal you need to run `npm run start:no-apps`

## E2E tests

To make sure that all ILC components play well together we use E2E tests. We use our Demo applications as test micro frontends 
so it also gives us ability to make sure that we don't break backward compatibility.

In order to run tests:

* Build ILC & Registry by running `npm run build`
* Change your current directory to `./e2e`
* Launch one of the following commands:
    * Default mode: `npm start`
    * Verbose mode: `npm run start:verbose`
    * Verbose mode with Browser UI visible: `npm run start:verbose:ui`

## Debug mode

ILC uses [debug](https://www.npmjs.com/package/debug) package at client side to produce
verbose logs for debug purposes. 
To enable it, execute `localStorage.debug = 'ILC:*'` in the browser console.

## Documentation website

1. First of all: `docker build -t ilc-mkdocs - < ./.mkdocs/Dockerfile`
1. After that 
    * **To run it in dev mode:** `docker run --rm -it -p 8000:8000 -v ${PWD}:/docs ilc-mkdocs`
    * **To build it:** `docker run --rm -it -p 8000:8000 -v ${PWD}:/docs ilc-mkdocs build`
