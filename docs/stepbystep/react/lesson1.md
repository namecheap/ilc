# Step by step apps creation with ILC, React, Lesson 1

Hi folks! This document will teach you how to create simple isomorphic React application and run it with ILC in few minutes.

So buckle in your seat belt and let's get started 🚀

## We need React app with SSR first

As you might already guess to build new micro frontend we need to have regular application first. 
Hopefully I already did all the dirty job for you dear reader. 

So you can go and grab it here https://github.com/StyleT/ilc-learning-react.
Or you can use https://codesandbox.io/s/github/StyleT/ilc-learning-react to have it running for you in the cloud.

As soon as you started the app - try to play few tic-tac-toe matches 😎

## Adapting the app to ILC

To make the application work correctly with ILC we need to make it compliant with [ILC to App interface](https://namecheap.github.io/ilc-sdk/pages/Pages/ilc_app_interface.html).
Fortunately that's pretty easy, go through the source code and resolve **all** the `//TODO:` comments I placed for you there.

As soon as you're finished with this - restart the app & try to open `/microfrontend` route. 
You should get `200 OK` response code & some SSR markup.

> Note: in case of any troubles - try to switch to the "step_1-ILC_integration" branch in the repo - it has all the changes already done for you.

## Configuring ILC to handle new app

In this step we're gonna use our public demo website and "[Develop right at "production"](../../develop_at_production.md)"
ILC feature to complete the task. We will do it for the sake of simplicity only. 
However you can achieve pretty the same results using ILC that you run locally.

To make your new fancy micro frontend work we need to determine your `publicPath` & `ssrPath` first.

* If you're using codesandbox.io _(recommended approach)_
    * Your `publicPath` will be somewhat like `https://abcde.sse.codesandbox.io/public/`. 
    Check the address bar of your virtual browser.
    * And your `ssrPath` will be `https://abcde.sse.codesandbox.io/microfrontend`
* If you're running app locally
    * Your `publicPath` will be `http://127.0.0.1:5000/public/`. 
    * And your `ssrPath` will be `http://XXX.XXX.XXX.XXX:5000/microfrontend` where you need to replace XXX with the white IP address of your machine.
    You can use services like https://ngrok.com/ to get one if your Internet provider keeps you behind NAT.
    
As soon as you've figured out all the details - let's change the ILC config for us. 
To do so you need to open http://demo.microfrontends.online/nosuchpath and execute the following code in browser console:

```javascript
var publicPath = 'https://abcde.sse.codesandbox.io/public/';
var ssrPath = 'https://abcde.sse.codesandbox.io/microfrontend';
var overrideConfig = encodeURIComponent(JSON.stringify({
    apps: {
        '@portal/myapp': {
            spaBundle: publicPath + 'client.js',
            cssBundle: publicPath + 'style.css',
            ssr: {
                src: ssrPath,
                timeout: 10000,
            },
            props: { publicPath },
            kind: 'primary',
        },
    },
    routes: [{
        routeId: 555,
        route: '/nosuchpath',
        slots: {
            body: {
                appName: '@portal/myapp'
            }
        }
    }]
}));

document.cookie = `ILC-overrideConfig=${overrideConfig}; path=/;`
```

Refresh the page after code execution. If you did everything correctly - you should be able to see your app running inside 
public ILC demo website.

If it doesn't work for you - ensure that `ssrPath` is accessible not only from your machine and JS/CSS links are actually
working. 
