import config from 'config';
import type { Request } from 'express';
import { SettingKeys } from '../../../settings/interfaces';
import type { OpenIdService } from '../../services/OpenIdService';

/** This Registry's own URL as the client sees it; `trust proxy` is set in production, so the proxy headers count */
export function issuerFromRequest(req: Request): string {
    return `${req.protocol}://${req.get('host')}`;
}

/**
 * The Registry's configured base URL, the one the OpenID provider redirects back to, without a trailing slash;
 * undefined when none is configured. The `infra.settings.baseUrl` config wins over the setting, as for the OpenID
 * callback URL.
 */
export async function configuredBaseUrl(openIdService: OpenIdService): Promise<string | undefined> {
    const fromConfig = config.get<string | null>('infra.settings.baseUrl');
    const value = fromConfig || (await openIdService.getConfigValue<string>(SettingKeys.BaseUrl));
    if (!value) {
        return undefined;
    }
    try {
        const url = new URL(value);
        return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
    } catch {
        return undefined;
    }
}
