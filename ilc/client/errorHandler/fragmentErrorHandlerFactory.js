import uuidv4 from 'uuid/v4';

import noticeError from './noticeError';
import crashIlc from './crashIlc';
import { FRAGMENT_KIND } from '../../common/constants';

export default function fragmentErrorHandlerFactory(registryConf, getRelevantAppKind, appName, slotName) {
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

        const fragmentKind = getRelevantAppKind(appName, slotName);
        const isEssentialOrPrimaryFragment = [ FRAGMENT_KIND.primary, FRAGMENT_KIND.essential ].includes(fragmentKind);
    
        if (isEssentialOrPrimaryFragment) {
            crashIlc(errorId);
        }
    };
}
