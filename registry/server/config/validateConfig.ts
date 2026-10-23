import { type RequestHandler } from 'express';
import { validated } from '../common/validation/validated';
import { getLogger } from '../util/logger';
import { configPayloadSchema, type ConfigService } from './ConfigService';

export function validateConfig(configService: ConfigService): RequestHandler {
    return validated({ body: configPayloadSchema }, async ({ body }, req, res) => {
        try {
            await configService.upsert(body, { user: req.user!, dryRun: true });
            res.status(200).json({ valid: true });
        } catch (error: unknown) {
            const logger = getLogger();
            logger.warn(
                error instanceof Error ? error : new Error(String(error)),
                'Config validation failed: %O',
                req.body,
            );
            const mappedError = configService.mapError(error);
            res.status(200).json({ valid: false, details: mappedError.message });
        }
    });
}
