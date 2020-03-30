const _ = require('lodash');
const deepmerge = require('deepmerge');

const errors = require('./errors');
const Router = require('./Router');

module.exports = class ServerRouter {
    errors = errors;

    #logger;
    /** @type {Registry} */
    #registry;
    #checkAfter = 0;

    /** @type {Router} */
    #router = null;

    /**
     *
     * @param {Registry} registry
     * @param logger - console compatible logger
     */
    constructor(registry, logger) {
        this.#registry = registry;
        this.#logger = logger;
    }

    async getTemplateInfo(reqUrl) {
        const registryConfig = await this.#registry.getConfig();
        const router = this.#getRouter(registryConfig);
        const route = router.match(reqUrl);
        const template = await this.#registry.getTemplate(route.template);

        if (template === undefined) {
            throw new Error('Can\'t match route base template to config map');
        }

        return {
            route,
            template: template.data,
            registryConfig: registryConfig.data,
            page: this.#generatePageTpl(route, registryConfig.data.apps),
        }
    }   

    #getRouter = (registryConfig) => {
        if (this.#router === null || registryConfig.checkAfter !== this.#checkAfter) {
            this.#checkAfter = registryConfig.checkAfter;
            this.#router = new Router(registryConfig.data);
        }

        return this.#router;
    };

    #generatePageTpl = (route, apps) => {
        let primarySlotDetected = false;

        return _.reduce(route.slots, (res, slotData, slotName) => {
            const appInfo = apps[slotData.appName];

            if (appInfo === undefined) {
                throw new Error('Can\'t find info about app: ' + slotData.appName);
            }

            if (appInfo.ssr === undefined) {
                return res;
            }

            const ssrOpts = deepmerge({}, appInfo.ssr);
            if (typeof ssrOpts.src !== "string") {
                throw new errors.RouterError({ message: 'No url specified for fragment', data: { appInfo } });
            }

            const url = new URL(ssrOpts.src);
            const fragmentName = `${slotData.appName.replace('@portal/', '')}__at__${slotName}`;
            const fragmentKind = slotData.kind || appInfo.kind;

            const reqProps = {
                basePath: route.basePath,
                reqUrl: route.reqUrl,
                fragmentName, //TODO: to be removed
            };

            url.searchParams.append('routerProps', Buffer.from(JSON.stringify(reqProps)).toString('base64'));

            if (slotData.props !== undefined || appInfo.props !== undefined) {
                const appProps =  _.merge({}, appInfo.props, slotData.props);
                url.searchParams.append('appProps', Buffer.from(JSON.stringify(appProps)).toString('base64'));
            }

            if (fragmentKind === 'primary' && primarySlotDetected === false) {
                ssrOpts.primary = true;
                primarySlotDetected = true;
            } else {
                if (fragmentKind === 'primary') {
                    this.#logger.warn(`More then one primary slot "${slotName}" found for "${reqProps.reqUrl}". Making it regular to avoid unexpected behaviour.`);
                }
                delete ssrOpts.primary;
            }

            ssrOpts.src = url.toString();

            return res + `
                <fragment
                    id="${slotData.appName}"
                    slot="${slotName}"
                    ${_.map(ssrOpts, (v, k) => `${k}="${v}"`).join(' ')}
                >
                </fragment>
            `;
        }, '');
    };

};
