import { StatusCodes } from 'http-status-codes';
import { NotFoundRegistryError, ValidationRegistryError } from '../registry/errors';
import { ErrorHandler } from '../types/ErrorHandler';
import { IlcRouteHandlerMethod } from '../types/IlcRouteHandlerMethod';
import { Registry } from '../types/Registry';

export function renderTemplateHandlerFactory(
    registryService: Registry,
    errorHandlingService: ErrorHandler,
): IlcRouteHandlerMethod<{ Params: { templateName: string } }> {
    return async (req, reply) => {
        const currentDomain = req.host;
        const locale = req.raw.ilcState?.locale;
        try {
            const data = await registryService.getTemplate(req.params.templateName, {
                locale,
                forDomain: currentDomain,
            });
            reply.status(200).send(data.data.content);
        } catch (error: unknown) {
            if (error instanceof NotFoundRegistryError) {
                return errorHandlingService.handleClientError(reply, error, StatusCodes.NOT_FOUND);
            } else if (error instanceof ValidationRegistryError) {
                return errorHandlingService.handleClientError(reply, error, StatusCodes.BAD_REQUEST);
            } else {
                throw error;
            }
        }
    };
}
