module.exports = class ErrorNotifier {
    #provider;

    constructor({
        provider,
    }) {
        this.#provider = provider;
    }

    notify(err, errInfo = {}) {
        if (this.#provider && this.#provider.noticeError) {
            this.#provider.noticeError(err, JSON.stringify(errInfo));
        }
        console.error(errInfo);
    }
};
