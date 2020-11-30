const _ = require('lodash');
const deepmerge = require('deepmerge');

const errors = require('../../common/router/errors');
const Router = require('../../common/router/Router');
const {makeAppId} = require('../../common/utils');

module.exports = class ServerRouter {
    errors = errors;

    #logger;

    /**
     * @param logger - console compatible logger
     */
    constructor(logger) {
        this.#logger = logger;
    }

    getTemplateInfo(registryConfig, url, ilcState = {}) {
        const router = new Router(registryConfig);

        let route;
        if (ilcState.forceSpecialRoute) {
            route = router.matchSpecial(url, ilcState.forceSpecialRoute);
        } else {
            route = router.match(url);
        }

        const page = this.#generatePageTpl(route, registryConfig.apps);

        return {
            route,
            page,
        };
    }

    #generatePageTpl = (route, apps) => {
        let primarySlotDetected = false;

        return _.reduce(route.slots, (res, slotData, slotName) => {
            const appName = slotData.appName;
            const appInfo = apps[appName];

            if (appInfo === undefined) {
                throw new this.errors.RouterError({message: 'Can\'t find info about app.', data: {appName}});
            }

            if (appInfo.ssr === undefined) {
                return res;
            }

            const ssrOpts = deepmerge({}, appInfo.ssr);
            if (typeof ssrOpts.src !== 'string') {
                throw new this.errors.RouterError({message: 'No url specified for fragment!', data: {appInfo}});
            }

            const url = new URL(ssrOpts.src);
            const fragmentName = makeAppId(appName, slotName);
            const fragmentKind = slotData.kind || appInfo.kind;

            const reqProps = {
                basePath: route.basePath,
                reqUrl: route.reqUrl,
                fragmentName,
            };

            url.searchParams.append('routerProps', Buffer.from(JSON.stringify(reqProps)).toString('base64'));

            if (slotData.props !== undefined || appInfo.props !== undefined) {
                const appProps = _.merge({}, appInfo.props, slotData.props);
                url.searchParams.append('appProps', Buffer.from(JSON.stringify(appProps)).toString('base64'));
            }

            if (fragmentKind === 'primary' && primarySlotDetected === false) {
                ssrOpts.primary = true;
                primarySlotDetected = true;
            } else {
                if (fragmentKind === 'primary') {
                    this.#logger.warn(
                        `More then one primary slot "${slotName}" found for "${reqProps.reqUrl}".\n` +
                        'Make it regular to avoid unexpected behaviour.'
                    );
                }
                delete ssrOpts.primary;
            }

            ssrOpts.src = url.toString();

            return res + `<fragment id="${appName}" slot="${slotName}" ${
                _.map(ssrOpts, (v, k) => `${k}="${v}"`).join(' ')
            }></fragment>`;
        }, '');
    };
};
