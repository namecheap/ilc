import * as singleSpa from 'single-spa';
import * as uuidv4 from 'uuid/v4';
import registryService from '../registry/factory';
import noticeError from './noticeError';

const System = window.System;

const FRAGMENT_KIND = Object.freeze({
    primary: 'primary',
    essential: 'essential',
    regular: 'regular',
});

const selectFragmentKind = (registryConf, path, appName, slotName) => {
    const appKind = registryConf.apps[appName].kind;
    const slotKind = path.slots[slotName] && path.slots[slotName].kind;

    return slotKind || appKind;
};

const isEssentialOrPrimaryFragment = (fragmentKind) => [
    FRAGMENT_KIND.primary,
    FRAGMENT_KIND.essential,
].includes(fragmentKind);

export default function (registryConf, getCurrentPath) {
    singleSpa.addErrorHandler((err) => {
        if (!navigator.onLine) {
            return window.location.reload();
        }

        const errorId = uuidv4();
        const [appName, slotName] = err.appOrParcelName.split('__at__');

        noticeError(err, {
            type: 'FRAGMENT_ERROR',
            appOrParcelName: err.appOrParcelName,
            errorId,
        });

        const currentPath = getCurrentPath();
        const fragmentKind = selectFragmentKind(registryConf, currentPath, `@portal/${appName}`, slotName);

        if (isEssentialOrPrimaryFragment(fragmentKind)) {
            registryService.getTemplate('500')
                .then((data) => {
                    data = data.data.replace('%ERRORID%', `Error ID: ${errorId}`);

                    document.querySelector('html').innerHTML = data;
                })
                .catch((err) => {
                    noticeError(err, {
                        type: 'FETCH_PAGE_ERROR',
                        name: err.toString(),
                        errorId: uuidv4(),
                        fragmentErrorId: errorId,
                    });

                    alert('Something went wrong! Please try to reload page');
                });
        }
    });

    window.addEventListener('error', function (event) {
        const moduleInfo = System.getModuleInfo(event.filename);
        if (moduleInfo === null) {
            return;
        }

        event.preventDefault();

        noticeError(event.error, {
            type: 'MODULE_ERROR',
            moduleName: moduleInfo.name,
            dependants: moduleInfo.dependants,
            location: {
                fileName: event.filename,
                lineNo: event.lineno,
                colNo: event.colno,
            }
        });
    });

    window.addEventListener('ilcFragmentError', function (event) {
        noticeError(event.detail.error, {
            type: 'FRAGMENT_ERROR',
            moduleName: event.detail.moduleInfo.name,
            extraInfo: event.detail.extraInfo,
        });
    });


    // Initializing 500 error page to cache template of this page
    // to avoid a situation when localhost can't return this template in future
    registryService.preheat()
        .then(() => console.log('Registry service preheated successfully'))
        .catch((err) => {
            noticeError(err, {
                errorId: uuidv4(),
            });
        });
}
