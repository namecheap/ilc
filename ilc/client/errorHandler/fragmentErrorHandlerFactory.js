import * as uuidv4 from 'uuid/v4';

import noticeError from './noticeError';
import registryService from '../registry/factory';

function fragmentErrorHandlerFactory(registryConf, getCurrentPath, appName, slotName) {
    return (error, errorInfo = {}) => {
        if (!navigator.onLine) {
            return window.location.reload();
        }

        const errorId = uuidv4();

        noticeError(error, {
            ...errorInfo,
            type: 'FRAGMENT_ERROR',
            appName,
            slotName,
            errorId,
        });

        const currentPath = getCurrentPath();
        const fragmentKind = selectFragmentKind(registryConf, currentPath, appName, slotName);

        if (isEssentialOrPrimaryFragment(fragmentKind)) {
            registryService.getTemplate('500')
                .then((data) => {
                    data = data.data.replace('%ERRORID%', `Error ID: ${errorId}`);

                    document.querySelector('html').innerHTML = data;
                })
                .catch((error) => {
                    noticeError(error, {
                        type: 'FETCH_PAGE_ERROR',
                        name: error.toString(),
                        errorId: uuidv4(),
                        fragmentErrorId: errorId,
                    });

                    alert('Something went wrong! Please try to reload page or contact support.');
                });
        }
    };
}

const FRAGMENT_KIND = Object.freeze({
    primary: 'primary',
    essential: 'essential',
    regular: 'regular',
});

function selectFragmentKind(registryConf, path, appName, slotName) {
    const appKind = registryConf.apps[appName].kind;
    const slotKind = path.slots[slotName] && path.slots[slotName].kind;

    return slotKind || appKind;
};

function isEssentialOrPrimaryFragment(fragmentKind) {
    return [
        FRAGMENT_KIND.primary,
        FRAGMENT_KIND.essential,
    ].includes(fragmentKind);
}

export default fragmentErrorHandlerFactory;
