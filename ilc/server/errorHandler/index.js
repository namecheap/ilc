const uuidv4 = require('uuid/v4');
const extendError = require('@namecheap/error-extender');

const noticeError = require('./noticeError');
const registryService = require('../registry/factory');

const ErrorHandlingError = extendError('ErrorHandlingError');

module.exports = async (err, req, res, next) => {
    const errorId = uuidv4();

    try {
        noticeError(err, {
            errorId
        });

        let data = await registryService.getTemplate('500');
        data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.status(500).send(data);
    } catch (causeErr) {
        const err = new ErrorHandlingError({
            cause: causeErr,
            d: {
                errorId,
            }
        });
        console.error(err);

        res.status(500).send('Oops! Something went wrong. Pls try to refresh page or contact support.');
    }
};
