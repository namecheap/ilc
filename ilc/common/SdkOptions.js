class SdkOptions {
    #i18n

    constructor(params) {
        if(params?.i18n?.manifestPath) {
            this.#i18n = params.i18n;
        }
    }

    toJSON() {
        if(!this.#i18n) {
            return undefined;
        }

        return {
            i18n: this.#i18n,
        }
    }
}

module.exports = {
    SdkOptions,
};
