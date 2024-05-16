import { type Strategy } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { AuthProviders } from '../../authEntities/interfaces';
import { type AuthService } from '../services/AuthService';

export async function localStrategyFactory(authService: AuthService): Promise<Strategy> {
    return new LocalStrategy(async function (username, password, done) {
        try {
            const user = await authService.getAuthEntity(AuthProviders.Local, username, password);
            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (e) {
            return done(e);
        }
    });
}
