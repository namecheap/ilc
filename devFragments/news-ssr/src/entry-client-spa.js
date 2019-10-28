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
if(window.__INITIAL_STATE__){
	store.replaceState(window.__INITIAL_STATE__);
}


const router = createRouter();
router.beforeResolve((to, from, next) => {
	if (window.__INITIAL_STATE__) { // We don't need to fetch data from server if we were loaded with SSR
		delete window.__INITIAL_STATE__;
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
});

const vueLifecycles = singleSpaVue({
	Vue,
	appOptions: {
		render: h => h(App),
		router: router,
		store,
	}
});

export const bootstrap = vueLifecycles.bootstrap;
export const mount = props => {
	console.log('News mount!!');
	return vueLifecycles.mount(props);
};
export const unmount = () => {
	console.log('News unmount!!');
	return vueLifecycles.unmount();
};
