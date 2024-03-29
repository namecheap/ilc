import { BaseTransitionHook } from './BaseTransitionHook';

export class TitleCheckerTransitionHook extends BaseTransitionHook {
    #title;
    #ssrRender = true;
    #currentPathGetter;
    #logger;

    constructor(currentPathGetter, logger) {
        super();
        this.#currentPathGetter = currentPathGetter;
        this.#logger = logger;
    }

    beforeHandler() {
        this.#title = document.head.title;
    }

    afterHandler() {
        const currentPath = this.#currentPathGetter();
        const route = currentPath.specialRole ? `special_${currentPath.specialRole}` : currentPath.route;

        if (this.#title === document.head.title && !this.#ssrRender) {
            const formattedTitleValue = document.head.title.length ? document.head.title : '<empty>';
            this.#logger.info(
                `ILC: Client side route change to "${route}" but not mutate <title>. Previous title is ${formattedTitleValue}`,
            );
        }

        if (document.head.title.length === 0) {
            this.#logger.info(`ILC: Client side route change to "${route}" but <title> is <empty>`);
        }

        this.#ssrRender = false;
    }
}
