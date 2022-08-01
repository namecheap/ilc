import {flattenFnArray} from './utils';
import transitionManager, {slotWillBe} from './TransitionManager/TransitionManager';
import {appIdToNameAndSlot} from '../common/utils';

const APP_STATES = {
    loaded: 0,
    bootstrapped: 1,
    mounted: 2,
    unmounted: 3,
};

export default class WrapApp {
    #wrapperConf;
    #appRenderedAtSsr = false;
    #appExtraProps = {};
    #transitionManager;

    #appState = 0;
    #wrapperState = 0;

    constructor(wrapperConf, ssrOverrideProps) {
        this.#wrapperConf = wrapperConf;
        this.#transitionManager = transitionManager();

        if (ssrOverrideProps) {
            this.#appExtraProps = ssrOverrideProps;
            this.#appRenderedAtSsr = true;
        }
    }

    wrapWith(appCallbacks, wrapperCallbacks) {
        appCallbacks = this.#canonizeCallbacks(appCallbacks, this.#getAppProps, 'app');
        wrapperCallbacks = this.#canonizeCallbacks(wrapperCallbacks, this.#getWrapperProps, 'wrapper');

        const bootstrap = async (props) => {
            debugger;
            if (this.#appRenderedAtSsr) {
                await appCallbacks.bootstrap(props);
            } else {
                this.#appExtraProps = {};
                await wrapperCallbacks.bootstrap(props);
            }
        };

        const mount = async (props) => {
            debugger;
            props.renderApp = this.#renderAppFactory(props, appCallbacks, wrapperCallbacks);

            if (this.#appRenderedAtSsr) {
                await appCallbacks.mount(props);

                this.#appRenderedAtSsr = false;
            } else {
                if (this.#wrapperState < APP_STATES.bootstrapped) {
                    await wrapperCallbacks.bootstrap(props);
                }

                await wrapperCallbacks.mount(props);
            }
        };

        const unmount = async (props) => {
            if (this.#appState !== APP_STATES.mounted) {
                await wrapperCallbacks.unmount(props);
            } else {
                await appCallbacks.unmount(props);
            }

            this.#appExtraProps = {};
        };

        return {
            bootstrap,
            mount,
            unmount,
            unload: appCallbacks.unload, //TODO: better handling of the "unload" callback for wrapper
        };
    }

     #getWrapperProps = (props) => {
        const newProps = Object.assign({}, props);
        newProps.appId = this.#wrapperConf.appId;
        newProps.getCurrentPathProps = () => this.#wrapperConf.props;
        newProps.getCurrentBasePath = () => '/';
        newProps.appWrapperData = {
            appId: this.#wrapperConf.appId;
        };

        return newProps;
    }

    #renderAppFactory = (props, appCallbacks, wrapperCallbacks) => async (extraProps = {}) => {
        this.#appExtraProps = extraProps;

        const {slotName} = appIdToNameAndSlot(props.appId);
        this.#transitionManager.handlePageTransaction(slotName, slotWillBe.rerendered);

        await wrapperCallbacks.unmount(props);

        if (this.#appState < APP_STATES.bootstrapped) {
            await appCallbacks.bootstrap(props);
        }
        await appCallbacks.mount(props);
    }

    #getAppProps = (props) => {
        const newProps = Object.assign({}, props);

        newProps.getCurrentPathProps = () => {
            const res = props.getCurrentPathProps();
            return Object.assign({}, res, this.#appExtraProps);
        }

        return newProps;
    }

    #canonizeCallbacks = (callbacks, wrapPropsWith, appType) => {
        debugger;
        const stateMap = {
            bootstrap: APP_STATES.bootstrapped,
            mount: APP_STATES.mounted,
            unmount: APP_STATES.unmounted
        };
        const cbTypes = Object.keys(stateMap);

        return cbTypes.reduce((acc, type) => {
            if (callbacks[type]) {
                const cb = flattenFnArray(callbacks, type);
                acc[type] = async (props) => {
                    const wrappedProps = wrapPropsWith(props);
                    const res = await cb(wrappedProps);

                    if (appType === 'wrapper') {
                        this.#wrapperState = stateMap[type];
                    } else {
                        this.#appState = stateMap[type];
                    }

                    return res;
                };
            }
            return acc;
        }, {});
    }
}
