import type { RequestHandler } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import errorHandlingService from '../errorHandler/factory';
import { NotFoundRegistryError, ValidationRegistryError } from '../registry/errors';
import Registry from '../registry/Registry';
import { PatchedHttpRequest } from '../types/PatchedHttpRequest';

export function renderTemplateHandlerFactory(registryService: Registry): RequestHandler<PatchedHttpRequest> {
    return async (req, reply) => {
        const currentDomain = req.hostname;
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
