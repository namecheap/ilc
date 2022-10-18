import * as uuidv4 from 'uuid/v4';
import extendError from '@namecheap/error-extender';

export const BaseError = extendError('BaseError', {
    defaultData: {
        get errorId() {
            return uuidv4();
        }
    }
});
