import type { User as RegistryUser } from '../server/auth';

declare global {
    namespace Express {
        interface User extends RegistryUser {}
    }
}

export {};
