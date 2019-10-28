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
