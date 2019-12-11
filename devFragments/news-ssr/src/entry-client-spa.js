import Vue from 'vue';
//import singleSpaVue from 'single-spa-vue' FIXME: this should be updated with forked library in NPM
import singleSpaVue from '../../../adapters/vuejs'
import App from './App.vue'
import { createRouter } from "./router";
import { createStore } from "./store";
import VueMeta from "vue-meta";


Vue.use(VueMeta, {
	// optional pluginOptions
	refreshOnceOnNavigation: true
});

Vue.mixin({
	beforeRouteUpdate (to, from, next) {
		const { asyncData } = this.$options;
		if (asyncData) {
			asyncData({
				store: this.$store,
				route: to
			}).then(next).catch(next)
		} else {
			next()
		}
	}
});

const store = createStore();
const router = createRouter();

const createBeforeResolveRouterHandler = (props) => (to, from, next) => {
	if (window[`__${props.name}__`]) { // We don't need to fetch data from server if we were loaded with SSR
		delete window[`__${props.name}__`];
		return next();
	}

	const matched = router.getMatchedComponents(to);
	const prevMatched = router.getMatchedComponents(from);

	let diffed = false;

	const activated = matched.filter((c, i) => {
		return diffed || (diffed = (prevMatched[i] !== c));
	});

	const asyncDataHooks = activated.map(c => c.asyncData).filter(_ => _);

	if (!asyncDataHooks.length) {
		return next()
	}

	Promise.all(asyncDataHooks.map(hook => hook({ store, route: to })))
		.then(() => {
			next();
		})
		.catch(next)
};

const replaceState = (props) => {
    if(window[`__${props.name}__`]) {
        store.replaceState(window[`__${props.name}__`]);
    }
};

const vueLifecycles = singleSpaVue({
	Vue,
	appOptions: {
		render: h => h(App),
		router,
		store,
	}
});

export const bootstrap = (props) => {
    console.log('News bootstrap!!');

    router.beforeResolve(createBeforeResolveRouterHandler(props));

    return vueLifecycles.bootstrap(props);
};

export const mount = props => {
    console.log('News mount!!');

    replaceState(props);

	return vueLifecycles.mount(props);
};
export const unmount = () => {
	console.log('News unmount!!');
	return vueLifecycles.unmount();
};
