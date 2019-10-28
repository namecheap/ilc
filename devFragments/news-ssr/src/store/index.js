import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

import { fetchSources, fetchHeadlines } from "../api/index"

export function createStore(){
	return new Vuex.Store({
		state: {
			sources: {},
			news: {}
		},
		actions: {
			fetchSources({commit}){
				return fetchSources().then((sources) => {
					commit('setSources', sources);
				});
			},
			fetchHeadlines({commit}, source){
				return fetchHeadlines(source).then((news) => {
					commit('setNews', {source, news});
				});
			}
		},
		mutations: {
			setSources(state, {sources}){
				Vue.set(state.sources, 'sources', sources);
			},
			setNews(state, {source, news}){
				Vue.set(state.news, source, news);
			}
		}
	})
}
