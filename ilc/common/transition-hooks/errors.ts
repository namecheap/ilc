import { extendError } from '../utils';

export const TransitionError = extendError('TransitionError', { defaultData: {} });

export const TransitionHookError = extendError('TransitionHookError', {
    parent: TransitionError,
    defaultData: {},
});
