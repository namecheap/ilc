const _ = require('lodash');
const deepmerge = require('deepmerge');

const errors = require('../../common/router/errors');
const Router = require('../../common/router/Router');
const {makeAppId} = require('../../common/utils');

module.exports = class ServerRouter {
    errors = errors;

    /** @type Console */
    #logger;
    /** @type http.IncomingMessage */
    #request;
    #registryConfig;
    /** @type string */
    #url;
    #router = null;

    /**
     * @param {Console} logger - console compatible logger
     * @param {http.IncomingMessage} request - console compatible logger
     * @param {string} url - console compatible logger
     */
    constructor(logger, request, url) {
        this.#logger = logger;
        this.#request = request;
        this.#registryConfig = request.registryConfig;
        this.#url = url;
    }

    getFragmentsTpl() {
        const route = this.getRoute();

        return _.reduce(this.#getSsrSlotsList(route.slots, this.#registryConfig.apps), (res, row) => {
            return res + `<fragment id="${row.appId}" slot="${row.name}"></fragment>`;
        }, '');
    }

    getFragmentsContext() {
        const route = this.getRoute();
        const apps = this.#registryConfig.apps;
        let primarySlotDetected = false;

        return _.reduce(this.#getSsrSlotsList(route.slots, apps), (res, row) => {
            const appId = row.appId;
            const appInfo = row.appInfo;

            const ssrOpts = _.pick(row.appInfo.ssr, ['src', 'timeout', 'ignoreInvalidSsl']);
            if (!ssrOpts.src || typeof ssrOpts.src !== 'string') {
                throw new this.errors.RouterError({message: 'No url specified for fragment!', data: {appInfo}});
            }

            if (ssrOpts.ignoreInvalidSsl === true) {
                ssrOpts['ignore-invalid-ssl'] = true;
            }
            delete ssrOpts.ignoreInvalidSsl;

            const fragmentKind = row.kind || appInfo.kind;
            if (fragmentKind === 'primary' && primarySlotDetected === false) {
                ssrOpts.primary = true;
                primarySlotDetected = true;
            } else {
                if (fragmentKind === 'primary') {
                    this.#logger.warn(
                        `More then one primary slot "${row.name}" found for "${this.#url}".\n` +
                        'Make it regular to avoid unexpected behaviour.'
                    );
                }
            }

            ssrOpts.appProps = deepmerge(appInfo.props || {}, row.props || {});
            ssrOpts.wrapperConf = row.wrapperConf;

            res[appId] = ssrOpts;

            return res;
        }, {});
    }

    getRoute() {
        if (this.#router === null) {
            this.#router = new Router(this.#registryConfig);
        }

        const ilcState = this.#getIlcState();

        if (ilcState.forceSpecialRoute) {
            return this.#router.matchSpecial(this.#url, ilcState.forceSpecialRoute);
        } else {
            return this.#router.match(this.#url);
        }
    }

    #getSsrSlotsList = (routeSlots, apps) => _.reduce(routeSlots, (res, slotData, slotName) => {
        let appName = slotData.appName;
        const appId = makeAppId(appName, slotName);
        const appInfo = apps[appName];

        if (appInfo === undefined) {
            throw new this.errors.RouterError({message: 'Can\'t find info about app.', data: {appName}});
        }
        if (appInfo.ssr === undefined) {
            return res;
        }

        let wrapperConf = null;
        if (appInfo.wrappedWith) {
            const wrapper = apps[appInfo.wrappedWith];

            if (wrapper.ssr === undefined) {
                // If wrapper doesn't support SSR - it will be disabled for all wrapped apps
                return res;
            }

            wrapperConf = {
                appId: makeAppId(appInfo.wrappedWith, slotName),
                name: appInfo.wrappedWith,
                ...wrapper.ssr,
                props: wrapper.props,
            }
        }

        res.push({
            name: slotName,
            ...slotData,
            appId,
            appInfo,
            wrapperConf,
        });

        return res;
    }, []);

    #getIlcState = () => this.#request.ilcState || {};
};
