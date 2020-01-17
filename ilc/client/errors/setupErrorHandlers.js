import * as singleSpa from 'single-spa';
import * as uuidv4 from 'uuid/v4';
import * as ejs from 'ejs/ejs.min.js';
import registryService from '../registry/factory';
import errorNotifier from './errorNotifier';

const System = window.System;

// Initializing 500 error page to cache template of this page
// to avoid a situation when localhost can't return this template in future
registryService.preheat()
    .then(() => console.log('Registry service preheated successfully'))
    .catch((err) => {
        errorNotifier.notify(err, {
            type: 'FETCH_PAGE_ERROR',
            name: err.toString(),
            extraInfo: {
                errorId: uuidv4(),
            },
        });
    });

const FRAGMENT_KIND = Object.freeze({
    primary: 'primary',
    essential: 'essential',
    regular: 'regular',
});

const selectFragmentKind = (registryConf, path, appName, slotName) => {
    const appKind = registryConf.apps[appName].kind;
    const slotKind = path.slots[slotName] && path.slots[slotName].kind;

    return slotKind || appKind;
}

const isEssentialOrPrimaryFragment = (fragmentKind) => [
    FRAGMENT_KIND.primary,
    FRAGMENT_KIND.essential,
].includes(fragmentKind);

export default function ({
    registryConf,
    getCurrentPath,
}) {
    singleSpa.addErrorHandler((err) => {
        if (!navigator.onLine) {
            return window.location.reload();
        }

        const errorId = uuidv4();
        const [appName, slotName] = err.appOrParcelName.split('__at__');

        const currentPath = getCurrentPath();
        const fragmentKind = selectFragmentKind(registryConf, currentPath, `@portal/${appName}`, slotName);

        if (isEssentialOrPrimaryFragment(fragmentKind)) {
            registryService.getTemplate('500')
                .then((data) => {
                    document.querySelector('html').innerHTML = ejs.render(data.data, {
                        errorId,
                    });
                })
                .catch((err) => {
                    alert('Something went wrong! Please try to reload page');

                    errorNotifier.notify(err, {
                        type: 'FETCH_PAGE_ERROR',
                        name: err.toString(),
                        extraInfo: {
                            errorId: uuidv4(),
                            fragmentErrorId: errorId,
                        },
                    });
                });
        }

        errorNotifier.notify(err, {
            type: 'FRAGMENT_ERROR',
            name: err.toString(),
            moduleName: err.appName,
            extraInfo: {
                errorId,
            },
        })
    });

    window.addEventListener('error', function (event) {
        const moduleInfo = System.getModuleInfo(event.filename);
        if (moduleInfo === null) {
            return;
        }

        event.preventDefault();

        errorNotifier.notify(event.error, {
            type: 'MODULE_ERROR',
            name: event.error.toString(),
            moduleName: moduleInfo.name,
            dependants: moduleInfo.dependants,
            stack: event.error.stack.split("\n"),
            location: {
                fileName: event.filename,
                lineNo: event.lineno,
                colNo: event.colno,
            }
        });
    });

    window.addEventListener('ilcFragmentError', function (event) {
        errorNotifier.notify(event.detail.error, {
            type: 'FRAGMENT_ERROR',
            name: event.detail.error.toString(),
            moduleName: event.detail.moduleInfo.name,
            extraInfo: event.detail.extraInfo,
            stack: event.detail.error.stack.split("\n"),
        });
    });
}
