import uuidv4 from 'uuid/v4';

import noticeError from './noticeError';
import crashIlc from './crashIlc';

export default function fragmentErrorHandlerFactory(registryConf, getCurrentPath, appName, slotName) {
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
            crashIlc(errorId);
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
