const uuidv4 = require('uuid/v4');
const extendError = require('@namecheap/error-extender');

const noticeError = require('./noticeError');
const registryService = require('../registry/factory');

const ErrorHandlingError = extendError('ErrorHandlingError');

module.exports = async (err, req, res) => {
    const errorId = uuidv4();

    // This handler serves as Fastify & Tailor handler.
    // While Fastify will pass it's own Reply object
    // Tailor passes http.ServerResponse from Node core
    let nres = res.res ? res.res : res;

    try {
        noticeError(err, {
            errorId
        });

        let data = await registryService.getTemplate('500');
        data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

        nres.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        nres.setHeader('Pragma', 'no-cache');
        nres.statusCode = 500;
        nres.write(data);
        nres.end();
    } catch (causeErr) {
        const err = new ErrorHandlingError({
            cause: causeErr,
            d: {
                errorId,
            }
        });
        console.error(err);

        nres.statusCode = 500;
        nres.write('Oops! Something went wrong. Pls try to refresh page or contact support.');
        nres.end();
    }
};
