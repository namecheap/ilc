import { User as RegistryUser } from './User';

declare global {
    namespace Express {
        interface User extends RegistryUser {}
    }
}

declare module 'express-session' {
    interface SessionData {
        oidc: object;
    }
}

export {};
