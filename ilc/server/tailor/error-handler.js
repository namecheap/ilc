const extendError = require('@namecheap/error-extender');

const TailorError = extendError('TailorError');

const errorHandler = require('../errorHandler');
const noticeError = require('../errorHandler/noticeError');

//TODO: handle errors from non-primary fragments
//TODO: Handle Bot specific behaviour
module.exports = function (req, err, res) {
    const urlPart = `while processing request "${req.originalUrl}"`;
    if (res !== undefined) {
        const e = new TailorError({message: `Tailor error ${urlPart}`, cause: err});
        errorHandler(e, req, res).catch(err => {
            noticeError(new TailorError({message: 'Something went terribly wrong during error handling', cause: err}));
        });
    } else {
        noticeError(new TailorError({message: `Tailor error while headers already sent ${urlPart}`, cause: err}));
    }
};
