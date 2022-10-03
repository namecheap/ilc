export class SdkAdapterFactory {

    #i18n;
    #router;

    constructor(i18n, router) {
        this.#i18n = i18n;
        this.#router = router;
    }

    getSdkAdapter(appId) {
        return {
            appId,
            intl: this.#i18n ? this.#i18n.getAdapter() : null,
            trigger404Page: (withCustomContent) => {
                if (withCustomContent) {
                    return;
                }

                this.#router.render404({
                    detail: { appId },
                });
            },
        };
    }
}
