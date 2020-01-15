const axios = require('axios');
const config = require('config');
const fetchWithCacheFactory = require('./fetchWithCache');

const getConfig = fetchWithCacheFactory(async () => {
    console.log('Calling get config registry endpoint...');
    const res = await axios.get(config.get('registry.address') + '/api/v1/config', {
        responseType: 'json',
    });

    return res.data;
});

const getTemplateByTemplateName = fetchWithCacheFactory(async (templateName) => {
    console.log('Calling get template registry endpoint...');
    const res = await axios.get(`${config.get('registry.address')}/api/v1/template/${encodeURIComponent(templateName)}`, {
        responseType: 'json',
    });

    return res.data;
}, {
    cacheForSeconds: 3600,
});

module.exports = {
    getConfig,
    getTemplateByTemplateName,
};
