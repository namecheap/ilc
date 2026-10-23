import { type RequestHandler } from 'express';
import { validated } from '../common/validation/validated';
import { configPayloadSchema, type ConfigService } from './ConfigService';

export function updateConfig(configService: ConfigService): RequestHandler {
    return validated({ body: configPayloadSchema }, async ({ body }, req, res) => {
        try {
            await configService.upsert(body, { user: req.user! });
            res.status(204).end();
        } catch (error: unknown) {
            const mappedError = configService.mapError(error);
            res.status(422).json({ details: mappedError.message });
        }
    });
}
