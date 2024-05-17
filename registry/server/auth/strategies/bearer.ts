import { type Strategy } from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { AuthProviders } from '../../authEntities/interfaces';
import { type AuthService } from '../services/AuthService';

export async function bearerStrategyFactory(authService: AuthService): Promise<Strategy> {
    return new BearerStrategy(async function (token, done) {
        try {
            const [encodedId, encodedSecret] = token.split(':');

            if (!encodedId || !encodedSecret) {
                return done(null, false);
            }

            const id = Buffer.from(encodedId, 'base64').toString('utf8');
            const secret = Buffer.from(encodedSecret, 'base64').toString('utf8');

            const user = await authService.getAuthEntity(AuthProviders.Bearer, id, secret);
            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (e) {
            return done(e);
        }
    });
}
