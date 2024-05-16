import config from 'config';
import { Logger } from 'ilc-plugins-sdk';
import { Issuer as OIDCIssuer, Strategy as OIDCStrategy, type TokenSet } from 'openid-client';
import { type Strategy } from 'passport';
import urljoin from 'url-join';
import { User } from '../../../typings/User';
import { AuthProviders, AuthRoles } from '../../authEntities/interfaces';
import { SettingKeys } from '../../settings/interfaces';
import { AuthService } from '../services/AuthService';
import { OpenIdService } from '../services/OpenIdService';

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
): Promise<Strategy> {
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

    const authDiscoveryUrl = await openIdService.getConfigValue(SettingKeys.AuthOpenIdDiscoveryUrl);
    let issuer: OIDCIssuer;
    try {
        issuer = await OIDCIssuer.discover(authDiscoveryUrl);
    } catch (error) {
        throw error;
    }

    const redirectUri = config.get('infra.settings.baseUrl')
        ? urljoin(config.get('infra.settings.baseUrl'), '/auth/openid/return')
        : urljoin(await openIdService.getConfigValue(SettingKeys.BaseUrl), '/auth/openid/return');

    const client = new issuer.Client({
        client_id: await openIdService.getConfigValue(SettingKeys.AuthOpenIdClientId),
        client_secret: await openIdService.getConfigValue(SettingKeys.AuthOpenIdClientSecret),
        redirect_uris: [redirectUri],
        response_types: ['code'],
    });

    return new OIDCStrategy(
        {
            client,
            params: {
                scope: await openIdService.getConfigValue(SettingKeys.AuthOpenIdRequestedScopes),
                response_mode: await openIdService.getConfigValue(SettingKeys.AuthOpenIdResponseMode),
            },
            sessionKey: 'oidc',
        },
        async (
            tokenSet: TokenSet,
            done: (err: unknown, user?: User | false, options?: { message: string }) => void,
        ) => {
            try {
                if (tokenSet.expired()) {
                    return done(null, false, {
                        message: 'Expired OpenID token',
                    });
                }

                const claims = tokenSet.claims();
                const idClaimName = await openIdService.getConfigValue(SettingKeys.AuthOpenIdIdentifierClaimName);
                const uidClaimName = await openIdService.getConfigValue(
                    SettingKeys.AuthOpenIdUniqueIdentifierClaimName,
                );

                const identifiers = extractClaims(claims[idClaimName]);
                if (!identifiers) {
                    const message = "Can't find user identifier using IdentityClaimName";
                    logger.warn({ claims: claims[idClaimName] }, message);
                    return done(null, false, { message });
                }

                const user = await findMostPermissiveUser(identifiers);

                if (!user) {
                    return done(null, false, {
                        message: `Can\'t find presented identifiers "${identifiers.toString()}" in auth entities list`,
                    });
                }

                if (uidClaimName) {
                    const claim = claims[uidClaimName];
                    if (typeof claim === 'string') {
                        user.identifier = claim;
                    }
                }

                return done(null, user);
            } catch (e) {
                return done(e);
            }
        },
    );
}
