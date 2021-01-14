const APP_STATES = {
    loaded: 0,
    bootstrapped: 1,
    mounted: 2,
    unmounted: 3,
};

export default function (appCallbacks, wrapperCallbacks, wrapperConf, ssrOverrideProps) {
    let appState = 0;
    let wrapperState = 0;

    const renderAppFactory = (props) => async (extraProps) => {
        //TODO: handle extra props
        await flattenFnArray(wrapperCallbacks, 'unmount')(getWrapperProps(wrapperConf, props));
        wrapperState = APP_STATES.unmounted;

        if (appState < APP_STATES.bootstrapped) {
            await flattenFnArray(appCallbacks, 'bootstrap')(props);
            appState = APP_STATES.bootstrapped;
        }
        await flattenFnArray(appCallbacks, 'mount')(props);
        appState = APP_STATES.mounted;
    }

    const bootstrap = async (props) => {
        if (ssrOverrideProps) { //App was rendered at SSR instead of wrapper
            await flattenFnArray(appCallbacks, 'bootstrap')(props);
            appState = APP_STATES.bootstrapped;
        } else {
            console.log('wrapApp bootstrap called!!');
            await flattenFnArray(wrapperCallbacks, 'bootstrap')(getWrapperProps(wrapperConf, props));
            wrapperState = APP_STATES.bootstrapped;
        }
    };

    const mount = async (props) => {
        props.renderApp = renderAppFactory(props);
        if (ssrOverrideProps) { //App was rendered at SSR instead of wrapper
            //TODO: handle ssrOverrideProps
            await flattenFnArray(appCallbacks, 'mount')(props);
            appState = APP_STATES.mounted;
            ssrOverrideProps = undefined;
        } else {
            if (wrapperState < APP_STATES.bootstrapped) {
                await flattenFnArray(wrapperCallbacks, 'bootstrap')(getWrapperProps(wrapperConf, props));
                wrapperState = APP_STATES.bootstrapped;
            }

            await flattenFnArray(wrapperCallbacks, 'mount')(getWrapperProps(wrapperConf, props));
            wrapperState = APP_STATES.mounted;
        }
    };

    const unmount = async (props) => {
        if (appState !== APP_STATES.mounted) {
            await flattenFnArray(wrapperCallbacks, 'unmount')(getWrapperProps(wrapperConf, props));
            appState = APP_STATES.unmounted;
        } else {
            await flattenFnArray(appCallbacks, 'unmount')(props);
            wrapperState = APP_STATES.unmounted;
        }
    };

    return {
        bootstrap,
        mount,
        unmount,
        //unload: spaCallbacks.unload, TODO: add unload support
    };
}

function getWrapperProps(wrapperConf, props) {
    const newProps = Object.assign({}, props);
    newProps.appId = wrapperConf.appId;
    newProps.getCurrentPathProps = () => wrapperConf.props;

    return newProps;
}

function flattenFnArray(appOrParcel, lifecycle) {
    let fns = appOrParcel[lifecycle] || [];
    fns = Array.isArray(fns) ? fns : [fns];
    if (fns.length === 0) {
        fns = [() => Promise.resolve()];
    }

    return function (props) {
        return fns.reduce((resultPromise, fn, index) => {
            return resultPromise.then(() => {
                const thisPromise = fn(props);
                return smellsLikeAPromise(thisPromise)
                    ? thisPromise
                    : Promise.reject(`The lifecycle function ${lifecycle} at array index ${index} did not return a promise`);
            });
        }, Promise.resolve());
    };
}

function smellsLikeAPromise(promise) {
    return (
        promise &&
        typeof promise.then === "function" &&
        typeof promise.catch === "function"
    );
}
