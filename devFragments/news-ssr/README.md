## Building a server side rendering web app using Vue.js

### Introduction

If you have been active in the Javascript ecosystem, then there is no denial you have seen or heard people arguing about how web apps should be served to the users. Many have argued rendering web apps on the client or on the server, with each side raising valid points. In this article, you are going to identify when it is appropriate to consider server side rendering and how to implement server side rendering using Vue.js

### What is server side rendering

Before diving into implementing server side rendering, you need to understand what it really means. Server side rendering has been existing for a long time. When you think of PHP, Python, Ruby and the likes, they serve the users already generated HTML codes. This means that, the application gets processed and rendered on the server and the output(HTML) sent to the client(browser).


### Pre rendering vs. server side rendering vs client side rendering

**Pre rendering:** This involves processing a route, capturing and caching the resulting DOM from a headless browser. This is usually great for web pages that are generic, not dynamic and don't have content changing time to time. However, if you want to serve web pages that are specific to the request parameters or personalised web pages, this will not be the best approach.

**Client side rendering:** This involves rendering the web pages on the client(usually browser). When a user requests a web page, the page layout, CSS and some scripts are loaded, then the JavaScript makes another request to the server to request the data needed to complete the page rendering. This is usually fast and once the page is fully loaded, subsequent requests are faster. On the other hand, performance and SEO is usually a problem as you are not in full control of the entire render process, also, there is the possibility of the user disabling JavaScript.

**server side rendering:** This is probably the oldest way of rendering web pages. When a user requests a web page, the data is rendered with the page layout and then returned to the client. This gives you full control over how your pages are rendered, since everything is done on the server configured to work the way you want. However, every request will have to be rendered on the server and sent back to the user has a new page, this increases loading time and could get turn off users.

Each of them have their strong and weak points, however, it is possible to use the strong points of both server side and client side rendering together to achieve the best user experience. It is possible to render the first page on the server and make subsequent requests render on the client. For example, we can handle rendering an article on the server, but handle users commenting on the article on the client side.

### What is Vue.js

[Vue](https://vuejs.org) is a JavaScript framework that focuses on binding views(what we see) with the app data models. Vue is built to be simple, flexible and compatible with other JavaScript frameworks. If you are building a simple SPA(single page application) that requires two-way binding between the views and data models, Vue is your best bet.

### What are we building

In this tutorial, we will be building a simple web app that allows you to see headline news from some of your favorite news sources. We will be making API requests to [News API](https://newsapi.org) to fetch the news sources and their headlines. By the time we are done building the app, it should be able to do the following:

1. See a list of news source (CNN, BBC, Bloomberg, etc)
2. See the headline news from any news source
3. Access the site when offline

Simple and awesome right? Let's get started!

### Folder structure

By the time we are done, the project folder structure will look like this:

root-directory
    |-- config
    |-- public
    |-- src
    |   |-- api
    |   |-- components
    |   |-- router
    |   |-- store

- `config` holds the configuration files for webpack and vue-loader
- `public` contains the app logos and other files that be exposed to the public
- `src` folder houses the app source files
- `api` contains the source files that make API calls to [News API](https://newsapi.org) to fetch news sources and headlines
- `components` folder contains the app Vue components
- `router` holds the file that defines the app routes
- `store` contains the file that handle data store and state management using Vuex

### Setting up

I will assume you have [Node](https://nodejs.org/en) and [NPM](https://www.npmjs.com) installed, if not, click on the links and install. Once you are done with that, create your project folder and run this in your terminal:

```bash
npm init
```

This will prompt you to setup your package name, version, license, etc, however, make sure to set entry point as `server.js`. Once this is completed, a `package.json` file will be created. Next, let's install some packages we will need to get started, run this: 

```bash
npm install express vue vue-server-renderer --save
```

This will install ExpressJS as Node.js server, Vue and Vue server renderer.

### Getting started with Vue

When building a web app that will be rendered on the client, our code will be executed in fresh context every time, however, this is not the case during server side rendering. When our code is executed on the server, it stays in memory and will be shared between every request, this can be catastrophic and lead to cross-request state pollution. To avoid this, we will create a function that will be executed to create a new instance of Vue, whenever there a request.

Let's quickly setup Express and render a simple Vue instance. Create a folder named `src` and file named `app.js` in `src` folder and copy the code below into it:

```js
const Vue = require('vue');

module.exports = function createApp () {
	return new Vue({
		data: {
			name: "Okubanjo Oluwafunsho"
		},
		template: `<div>My name is: {{ name }}</div>`
	});
};
```

In the code snippet above, Vue was imported and we exported function `createApp()` that returns an instance of Vue. Next step, let's create the page template for the web app. This template will act as a HTML page shell and will be used by the renderer. Copy the code snippet below:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>{{ title }}</title>
    <meta charset="utf-8">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <link rel="apple-touch-icon" sizes="120x120" href="/public/logo.png">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
    <link rel="shortcut icon" sizes="48x48" href="/public/logo.png">
    <meta name="theme-color" content="#f60">
    <link rel="manifest" href="/manifest.json">
    <style>
        *{
            padding:0;
            margin:0;
            box-sizing: border-box;
        }
        html, body{
            font-family: Lato, sans-serif;
            font-weight: 300;
            font-size: 10px;
        }
    </style>
</head>
<body>
<!--vue-ssr-outlet-->
</body>
</html>
```
The app's markup will be injected into the page template where `<!--vue-ssr-outlet-->` comment is. Next, create `server.js` in the project root folder and copy the code snippet below:

```js
'use strict';

const express = require('express');
const renderer = require('vue-server-renderer').createRenderer({
	template: require('fs').readFileSync('./src/index.template.html', 'utf-8')
});
const createApp = require('./src/app');

const server = express();

server.get('*', (req, res) => {
	const app = createApp();
	
	const context = {
		title: "Vue SSR Tutorial"
	};

	renderer.renderToString(app, context, (err, html) => {
		if (err) {
			console.log(err);
			res.status(500).send('Internal Server Error');
			return
		}
		res.send(html);
	});
});

server.listen(4000, () => {
	console.log("Server started");
});

```

In the code snippet above we imported Express, `createApp` function from `src/app.js` and vue-server-renderer. The page template `index.template.html` we created earlier is set as the renderer's template and an instance of Express `server` was created. Any time a request is made to any route, the Vue instance is rendered to string using vue-server-renderer and the response (error message or rendered string) is sent. Finally, we configured the server to listen on port 3000.

To see this simple example of server side rendering, execute this in your terminal:

```bash
node server
```

You should be able to view a web page that says "My name is: Okubanjo Oluwafunsho". 

This a simple server side rendered web page using Vue :)


### Routing using vue-router

The simple app we created above will always print out `My name is: Okubanjo Oluwafunsho` no matter the route we visit, however in real life scenario, this won't be the case. Different routes have different purposes and we need to handle each route properly. We will use `vue-router` to handle the app routes. Let's install `vue-router`, run this in your terminal:

```bash
npm install vue-router --save
```

Next, let's create the file that will handle the routes. Create a folder `router` in the `src` folder and create a file `index.js` in it, the file path should be `src/router/index.js`. Copy the code snippet below into the file:

```js
import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export const createRouter = () => {
	return new Router({
		mode: 'history',
		routes: [
			{ path: '/', component: () => import('../components/Home.vue') },
			{ path: '/article/:source', component: () => import('../components/Articles.vue')}
		]
	});
};
```
In the snippet above, Vue & `vue-router` were imported, also, we made Vue use the `vue-router` plugin. Also, we defined two routes `/` and `/articles/:source`, the first handles the homepage and the other handles the headline news for a particular source. We then imported a component for each route, these components will handle the logic. Since we need a fresh instance of the router for each request, we exported `createRouter` function. 

Next, create `App.vue` in `src` folder, so that the path is `src/App.vue`. This file will be the parent component for the app. Copy the code snippet below:

```vue
<template>
    <div id="app">
        <header class="header">
            <div class="container-nav">
                <h1 class="brand">Headline News</h1>
                <nav class="inner">
                    <a href="https://newsapi.org/" target="_blank" rel="noopener">News API</a>
                    <a href="https://github.com/iamfunsho/vue-ssr-example" target="_blank" rel="noopener">Github Repo</a>
                    <a href="https://ssr.vuejs.org" target="_blank" rel="noopener">Vue.JS SSR</a>
                </nav>
            </div>
        </header>
        <transition name="fade" mode="out-in">
            <router-view class="view"></router-view>
        </transition>
    </div>
</template>

<style>
    .header{
        background-color: #515E7E;
        padding: 1.5rem 1rem;
        text-align: center;
    }
    .container-nav{
        max-width: 1000px;
        margin: auto;
    }
    .brand{
        font-size: 2rem;
        line-height: 1.5;
        font-weight: 900;
        color: #F1EDEC;
        display: inline-block;
        margin-right: 5rem;
    }
    nav.inner{
        display: inline-block;
    }
    nav.inner a{
        text-decoration: none;
        color: #F1EDEC;
        font-size: 1.6rem;
        line-height: 1.5;
        font-weight: 300;
        text-transform: capitalize;
        padding: 0 1rem;
    }
    nav.inner a:hover{
        text-decoration: underline;
    }
</style>
```

In the code structure above, we created the parent template. This template has the app header, defines how the app will transition from a route to the next. `<router-view class="view"></router-view>` handles which component will be injected based on the route visited.

Next step, we need inject the router into the Vue instance in `app.js`. Update the file the code snippet below:

```js
import Vue from 'vue'
import App from './App.vue'
import { createRouter } from "./router";

export function createApp () {
	
	const router = createRouter();
	
	const app = new Vue({
		
		router,
		render: h => h(App)
		
	});
	return { app, router}
}

```
In the code snippet above, we imported Vue, the parent component and the router. We then exported function `createApp()` that returns the router and the Vue instance.

### API requests and response caching using lru-cache

The app needs to fetch the data it needs from [News API](https://newsapi.org), therefore, we need to create the functions that will fetch the data and cache them. For this tutorial, we will be using `lru-cache` to handle caching and `axios` to make requests to the API endpoints. Run this in your terminal:

```bash
npm install lru-cache axios --save
```
LRU cache deletes least recently used items when low on memory or approaching maximum size limit. This ideal for most scenario, as we want popular items to be readily available.

Since our app will render on the server and also on the client, we will have to setup `axios` separately, also, caching will be done on the server and not on the client. We are going to setup `axios` for both server and client side, create a folder `api` and create two files in it `axios-client.js` and `axios-server.js`. Copy the code snippet below into `src/api/axios-client.js`:

```js
const axios = require('axios');

export function API(){
	return axios;
}
```
In the code snippet above, we imported `axios` and exported function `API()` which returns `axios`. Copy below into `src/api/axios-server.js`:

```js
const axios = require('axios');
const LRU = require('lru-cache');

export function API(){
	
	axios.server = true;
	axios.cachedItems = LRU({
		max: 1000,
		maxAge: 1000 * 60 * 10
	});
	
	return axios;
}
```
We imported `axios` and `lru-cache` and exported function `API()`. In function API() we added a way to know if the app is running on server or not. Also, we created an instance of LRU and attached it to `axios` before returning it. It has a maximum size of 1000 items and items older than 10 minutes are expired.

Now, let's create the functions that will make the API calls, create `index.js` in `src/api` and copy the code snippet below:

```js
const {API} = require('axios-client');
const NEWS_API = "97c568e8528f40be944a8c047aef2210";

const client = API();

if(client.server){
	cacheSources();
}

function cacheSources(){
	fetchSources();
	setTimeout(cacheSources, 1000 * 60 * 10);
}

function fetch(url, params = null){
	
	const cache = client.cachedItems;
	
	let key;
	
	if(params) {
		key = url + '_' + params.source;
	}else {
		key = url;
	}
	
	if(cache && cache.has(key)){
		return Promise.resolve(cache.get(key));
	}else {
		return new Promise((resolve, reject) => {
			client.get(url, {
				params: params
			}).then((res) => {
				
				if(res.data.status === "ok"){
					cache && cache.set(key, res.data);
					resolve(res.data);
				}else{
					reject("News API error: " + res.data.message);
				}
				
			}).catch((err) => {
				reject("Axios issue: " + err)
			})
		});
	}
}

export function fetchSources() {
	return fetch('https://newsapi.org/v1/sources');
}

export function fetchHeadlines(source) {
	return fetch('https://newsapi.org/v1/articles', { source: source, apiKey: NEWS_API });
}

``` 

Above, we imported `axios` depending on the environment; server or client side. This is handled by `webpack`, which creates an alias `axios-client` that resolves to `axios-server.js` if on the server or `axios-client.js` if on the client side.

Function `fetch()` gets the instance `lru-cache` attached to function `API()` in `axios-server.js` earlier, and uses it to set responses in or get responses from the cache.

### Data pre-fetching and state management using Vuex

### Vue Components

When we defined the router above, we assigned components to the two routes we created, jow let's define those components

### Service workers and app manifest

### Building and deployment

### Conclusion
