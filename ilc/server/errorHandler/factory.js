import newrelic from 'newrelic';
import reportPlugin from '../plugins/reportingPlugin';
import { registryFactory } from '../registry/factory';
import ErrorHandler from './ErrorHandler';

export const errorHandlerFactory = () => {
    const logger = reportPlugin.getLogger();
    const registryService = registryFactory();
    return new ErrorHandler(registryService, newrelic, logger);
};
