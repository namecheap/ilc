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
        const json = {
            i18n: this.#i18n,
            cssBundle: this.#cssBundle,
        };

        const allValuesUndefined = Object.values(json).every((value) => value === undefined);

        return allValuesUndefined ? undefined : json;
    }
}

module.exports = {
    SdkOptions,
};
