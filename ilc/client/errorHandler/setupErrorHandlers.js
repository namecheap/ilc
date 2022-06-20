import * as singleSpa from 'single-spa';
import * as uuidv4 from 'uuid/v4';

import fragmentErrorHandlerFactory from './fragmentErrorHandlerFactory';
import registryService from '../registry/factory';
import noticeError from './noticeError';
import {appIdToNameAndSlot} from '../../common/utils';
import internalErrorHandler from './internalErrorHandler';
import navigationErrors from '../navigationEvents/errors';

const System = window.System;

export default function (registryConf, getRelevantAppKind, setNavigationErrorHandler, transitionManager) {
    setNavigationErrorHandler((error, errorInfo = {}) => {
        internalErrorHandler(new navigationErrors.NavigationError({
            data: errorInfo,
            cause: error,
        }));
    });

    singleSpa.addErrorHandler((error) => {
        const {appName, slotName} = appIdToNameAndSlot(error.appOrParcelName);
        const fragmentErrorHandler = fragmentErrorHandlerFactory(registryConf, getRelevantAppKind, appName, slotName);

        transitionManager.reportSlotRenderingError(slotName);

        fragmentErrorHandler(error);
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

    // Initializing 500 error page to cache template of this page
    // to avoid a situation when localhost can't return this template in future
    registryService.preheat()
        .then(() => console.log('ILC: Registry service preheated successfully'))
        .catch((err) => {
            noticeError(err, {
                errorId: uuidv4(),
            });
        });
}
