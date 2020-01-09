import * as singleSpa from 'single-spa';
import * as uuidv4 from 'uuid/v4';

const System = window.System;
const newrelic = window.newrelic;

const KIND_OF_PRIMARY_FRAGMENT = 'primary';
const KIND_OF_ESSENTIAL_FRAGMENT = 'essential';

const selectFragmentKind = (registryConf, path, appName, slotName) => {
    const appKind = registryConf.apps[appName].kind;
    const slotKind = path.slots[slotName] && path.slots[slotName].kind;

    return slotKind || appKind;
}

const isEssentialOrPrimaryFragment = (fragmentKind) => [KIND_OF_PRIMARY_FRAGMENT, KIND_OF_ESSENTIAL_FRAGMENT].includes(fragmentKind);

export default function ({
    registryConf,
    getCurrentPath,
}) {
    singleSpa.addErrorHandler((err) => {
        const errorId = uuidv4();
        const [appName, slotName] = err.appOrParcelName.split('__at__');

        const currentPath = getCurrentPath();
        const fragmentKind = selectFragmentKind(registryConf, currentPath, `@portal/${appName}`, slotName);

        if (isEssentialOrPrimaryFragment(fragmentKind)) {
            fetch(`/_ilc/page/500/${errorId}`)
                .then((res) => {
                    if (!res.ok) {
                        return Promise.reject(new Error('Something went wrong!'));
                    }

                    return res.text()
                })
                .then((text) => {
                    document.querySelector('html').innerHTML = text;
                })
                .catch((err) => {
                    alert(err.message);
                });
        }

        console.error(JSON.stringify(err));
    });

    window.addEventListener('error', function (event) {
        const moduleInfo = System.getModuleInfo(event.filename);
        if (moduleInfo === null) {
            return;
        }

        event.preventDefault();

        const errInfo = {
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
        };

        if (newrelic && newrelic.noticeError) {
            newrelic.noticeError(event.error, errInfo);
        }
        console.error(JSON.stringify(errInfo));
    });

    window.addEventListener('ilcFragmentError', function (event) {
        const errInfo = {
            type: 'FRAGMENT_ERROR',
            name: event.detail.error.toString(),
            moduleName: event.detail.moduleInfo.name,
            extraInfo: event.detail.extraInfo,
            stack: event.detail.error.stack.split("\n"),
        };

        if (newrelic && newrelic.noticeError) {
            newrelic.noticeError(event.detail.error, errInfo);
        }
        console.error(JSON.stringify(errInfo));
    });
}
