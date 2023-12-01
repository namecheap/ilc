class SdkOptions {
    #i18n;
    #cssBundle;

    constructor(params) {
        if (params?.i18n?.manifestPath) {
            this.#i18n = params.i18n;
        }
        if (params?.cssBundle) {
            this.#cssBundle = params.cssBundle;
        }
    }

    toJSON() {
        if (!this.#i18n) {
            return undefined;
        }

        return {
            i18n: this.#i18n,
            cssBundle: this.#cssBundle,
        };
    }
}

module.exports = {
    SdkOptions,
};
