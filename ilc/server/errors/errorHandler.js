const uuidv4 = require('uuid/v4');
const errorNotifier = require('./errorNotifier');
const registryService = require('../registry/factory');

module.exports = async (err, req, res, next) => {
    const errorId = uuidv4();

    try {
        errorNotifier.notify(err, {
            type: 'SERVER_ERROR',
            name: err.toString(),
            extraInfo: {
                errorId,
            },
        });

        let data = await registryService.getTemplate('500');
        data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.status(500).send(data);
    } catch (err) {
        res.status(500).send();

        errorNotifier.notify(err, {
            type: 'GET_TEMPLATE_BY_TEMPLATE_NAME_ERROR',
            name: err.toString(),
            extraInfo: {
                errorId: uuidv4(),
            },
        });
    }
};
