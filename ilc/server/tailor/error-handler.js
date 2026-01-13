const errors = require('./errors');

/**
 * Setup error handlers for Tailor
 * @param {Tailor} tailor
 * @param {ErrorHandler} errorHandlingService
 */

const IGNORED_ERRORS = ['SeobotsGuardStreamError'];

module.exports = function setup(tailor, errorHandlingService) {
    function handleError(req, error, res) {
        const urlPart = `while processing request "${req.url}"`;
        // If fragment respond with 404 - force special 404 route
        // See "process-fragment-response.js", there we throw this error
        if (error.cause instanceof errors.Fragment404Response) {
            req.ilcState.forceSpecialRoute = '404';
            tailor.requestHandler(req, res);
            return;
        }

        const wrappedError = new errors.TailorError({ message: `Tailor error ${urlPart}`, cause: error });
        const shouldWriteResponse = Boolean(res);

        if (shouldWriteResponse) {
            errorHandlingService.handleError(wrappedError, req, res);
        } else if (!IGNORED_ERRORS.includes(error.name)) {
            errorHandlingService.noticeError(
                wrappedError,
                { userAgent: req.headers['user-agent'] },
                { reportError: !req.ldeRelated },
            );
        }
    }

    function handleFragmentError(req, fragmentAttrs, err) {
        if (fragmentAttrs.primary) {
            return;
        }

        const errOpts = {
            message: `Non-primary "${fragmentAttrs.id}" fragment error while processing "${req.url}"`,
            cause: err,
            data: { fragmentAttrs },
        };
        errorHandlingService.noticeError(new errors.FragmentError(errOpts), {}, { reportError: !req.ldeRelated });
    }

    function handleFragmentWarn(req, fragmentAttrs, err) {
        const errOpts = {
            message: `Non-primary "${fragmentAttrs.id}" fragment warning while processing "${req.url}"`,
            cause: err,
            data: { fragmentAttrs },
        };
        errorHandlingService.noticeError(new errors.FragmentWarn(errOpts), {}, { reportError: !req.ldeRelated });
    }

    //General Tailor & primary fragment errors
    tailor.on('error', handleError);
    //Non-primary fragment errors
    tailor.on('fragment:error', handleFragmentError);
    //Non-primary fragment warnings
    tailor.on('fragment:warn', handleFragmentWarn);
};
