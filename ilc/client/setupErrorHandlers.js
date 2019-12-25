const System = window.System;
const newrelic = window.newrelic;

export default function () {
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
