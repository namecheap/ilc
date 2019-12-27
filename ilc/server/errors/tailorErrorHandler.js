const ejs = require('ejs');
const uuidv4 = require('uuid/v4');
const { TEMPLATE_NOT_FOUND } = require('node-tailor/lib/fetch-template');
const errorNotifier = require('./errorNotifier');
const registryService = require('../registry/registryService');

module.exports = async (err, req, res) => {
    const errorId = uuidv4();
    const isNoTemplate = err.code === TEMPLATE_NOT_FOUND || (Boolean(err.data) && err.data.code === TEMPLATE_NOT_FOUND);

    const data = await registryService.getTemplate('500');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(500).send(ejs.render(data.data.content, { errorId }));

    errorNotifier.notify(err, {
        type: 'TAILOR_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
            isNoTemplate,
        },
    });
};
