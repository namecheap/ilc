import type { OAuthAuthorizationRequest, OAuthScope, ScopedSession } from '../server/auth/oauth/interfaces';
import { User as RegistryUser } from './User';

declare global {
    namespace Express {
        interface User extends RegistryUser {}

        interface Request {
            /** The scope limits of the session the request came with, absent for the UI login and auth entities */
            scopedSession?: ScopedSession;
        }
    }
}

declare module 'express-session' {
    interface SessionData {
        oidc?: object;
        /** Where passport keeps the serialized user */
        passport?: { user?: RegistryUser };
        scopes?: OAuthScope[];
        absoluteExpiresAt?: string;
        client?: string;
        /** The authorize request a login continues */
        oauthRequest?: OAuthAuthorizationRequest;
    }
}

export {};
