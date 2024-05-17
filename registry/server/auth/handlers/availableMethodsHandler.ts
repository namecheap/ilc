import { type RequestHandler } from 'express';
import { type OpenIdService } from '../services/OpenIdService';

export function availableMethodsHandlerFactory(openIdService: OpenIdService): RequestHandler {
    return async function availableMethodsHandler(req, res) {
        const availableMethods = ['local'];

        if (await openIdService.isEnabled()) {
            availableMethods.push('openid');
        }

        res.json(availableMethods);
    };
}
