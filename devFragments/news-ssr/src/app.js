import Vue from 'vue'
import App from './App.vue'
import { createRouter} from "./router";
import { createStore } from "./store/index";
import VueMeta from "vue-meta";

export function createApp () {
	
	const router = createRouter();
	const store = createStore();

	Vue.use(VueMeta, {
		refreshOnceOnNavigation: true
	});
	
	const app = new Vue({
		
		router,
		store,
		render: h => h(App)
		
	});
	return { app, router, store }
}
