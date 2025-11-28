import config from 'config';
import { Logger } from 'ilc-plugins-sdk';
import * as client from 'openid-client';
import { type VerifyFunction, type StrategyOptions } from 'openid-client/passport';
import urljoin from 'url-join';
import { User } from '../../../typings/User';
import { AuthProviders, AuthRoles } from '../../authEntities/interfaces';
import { SettingKeys } from '../../settings/interfaces';
import { AuthService } from '../services/AuthService';
import { OpenIdService } from '../services/OpenIdService';
import { CustomOIDCStrategy } from './CustomOIDCStrategy';

function extractClaims(value: unknown): string[] | null {
    if (typeof value === 'string') {
        return [value];
    } else if (Array.isArray(value)) {
        return value.filter((x) => typeof x === 'string');
    } else {
        return null;
    }
}

export async function oidcStrategyFactory(
    openIdService: OpenIdService,
    authService: AuthService,
    logger: Logger,
): Promise<CustomOIDCStrategy> {
    async function findMostPermissiveUser(identifiers: string[]): Promise<User | null> {
        const userEntities = await Promise.all(
            identifiers.map(async (identifier) => {
                const entity = await authService.getAuthEntity(AuthProviders.OpenID, identifier, null);
                return entity;
            }),
        );

        const filteredEntities = userEntities.filter((x): x is User => x !== null);

        const mostPermissiveUser = filteredEntities.reduce((prevUser: User | null, currentUser: User) => {
            if (!prevUser) {
                return currentUser;
            }
            if (currentUser.role === AuthRoles.admin) {
                return currentUser;
            }
            return prevUser;
        }, null);

        return mostPermissiveUser;
    }

    const authDiscoveryUrl = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdDiscoveryUrl);
    if (!authDiscoveryUrl) {
        throw new Error(`OpenID Discovery URL is not configured in settings: ${SettingKeys.AuthOpenIdDiscoveryUrl}`);
    }

    const authDiscoveryUrlTrimmed = authDiscoveryUrl.trim().replace(/\/+$/, '');

    const baseUrl = await openIdService.getConfigValue<string>(SettingKeys.BaseUrl);
    if (!baseUrl) {
        throw new Error(`Base URL is not configured in settings: ${SettingKeys.BaseUrl}`);
    }

    const callbackURL = config.get('infra.settings.baseUrl')
        ? urljoin(config.get('infra.settings.baseUrl'), '/auth/openid/return')
        : urljoin(baseUrl, '/auth/openid/return');

    const clientId = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdClientId);
    if (!clientId) {
        throw new Error(`OpenID Client ID is not configured in settings: ${SettingKeys.AuthOpenIdClientId}`);
    }

    const clientSecret = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdClientSecret);

    const allowInsecureRequests = authDiscoveryUrl.startsWith('http://');
    const issuerConfig = await client.discovery(
        new URL(authDiscoveryUrlTrimmed),
        clientId,
        clientSecret ? { client_secret: clientSecret } : undefined,
        undefined,
        allowInsecureRequests
            ? {
                  execute: [client.allowInsecureRequests],
              }
            : undefined,
    );

    const scope = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdRequestedScopes);
    const responseMode = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdResponseMode);

    // v6 Strategy options
    const strategyOptions: StrategyOptions = {
        config: issuerConfig,
        callbackURL,
        scope: scope || 'openid',
    };

    // v6 verify function
    const verify: VerifyFunction = async (tokens, verified) => {
        try {
            const claims = tokens.claims();

            if (!claims) {
                return verified(null, false, {
                    message: 'No claims in token',
                });
            }

            // Check token expiration
            if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
                return verified(null, false, {
                    message: 'Expired OpenID token',
                });
            }

            const idClaimName = await openIdService.getConfigValue<string>(SettingKeys.AuthOpenIdIdentifierClaimName);
            if (!idClaimName) {
                throw new Error(
                    `Identifier Claim Name is not configured in settings: ${SettingKeys.AuthOpenIdIdentifierClaimName}`,
                );
            }

            const uidClaimName = await openIdService.getConfigValue<string>(
                SettingKeys.AuthOpenIdUniqueIdentifierClaimName,
            );

            const identifiers = extractClaims(claims[idClaimName]);
            if (!identifiers) {
                const message = "Can't find user identifier using IdentityClaimName";
                logger.warn({ claims: claims[idClaimName] }, message);
                return verified(null, false, { message });
            }

            const user = await findMostPermissiveUser(identifiers);

            if (!user) {
                return verified(null, false, {
                    message: `Can't find presented identifiers "${identifiers.toString()}" in auth entities list`,
                });
            }

            if (uidClaimName) {
                const claim = claims[uidClaimName];
                if (typeof claim === 'string') {
                    user.identifier = claim;
                }
            }

            return verified(null, user);
        } catch (e) {
            return verified(e);
        }
    };

    // Create custom strategy with response_mode support
    return new CustomOIDCStrategy(strategyOptions, verify, responseMode);
}
