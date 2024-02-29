const errors = require('./errors');

/**
 * Setup error handlers for Tailor
 * @param {Tailor} tailor
 * @param {ErrorHandler} errorHandlingService
 */
module.exports = function setup(tailor, errorHandlingService) {
    //TODO: Handle Bot specific behaviour
    function handleError(req, err, res) {
        const urlPart = `while processing request "${req.originalUrl}"`;
        if (res !== undefined) {
            // If fragment respond with 404 - force special 404 route
            // See "process-fragment-response.js", there we throw this error
            if (err.cause instanceof errors.Fragment404Response) {
                req.ilcState.forceSpecialRoute = '404';
                tailor.requestHandler(req, res);
                return;
            }

            const e = new errors.TailorError({ message: `Tailor error ${urlPart}`, cause: err });
            errorHandlingService.handleError(e, req, res).catch((err) => {
                errorHandlingService.noticeError(
                    new errors.TailorError({
                        message: 'Something went terribly wrong during error handling',
                        cause: err,
                    }),
                );
            });
        } else {
            errorHandlingService.noticeError(
                new errors.TailorError({ message: `Tailor error while headers already sent ${urlPart}`, cause: err }),
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
            message: `Non-primary "${fragmentAttrs.id}" fragment error while processing "${req.originalUrl}"`,
            cause: err,
            data: { fragmentAttrs },
        };
        errorHandlingService.noticeError(new errors.FragmentError(errOpts), {}, { reportError: !req.ldeRelated });
    }

    function handleFragmentWarn(req, fragmentAttrs, err) {
        const errOpts = {
            message: `Non-primary "${fragmentAttrs.id}" fragment warning while processing "${req.originalUrl}"`,
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
