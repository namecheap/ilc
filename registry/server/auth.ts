import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import session from 'express-session';
import sessionKnex from 'connect-session-knex';
import {Express, RequestHandler} from 'express';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import * as bcrypt from 'bcrypt';
import {
    Issuer as OIDCIssuer,
    Strategy as OIDCStrategy,
    TokenSet,
    UserinfoResponse
} from 'openid-client';

import db from './db';

export default async (app: Express, config: any): Promise<RequestHandler> => {
    const SessionKnex = sessionKnex(session);
    const sessionConfig = Object.assign({
        resave: false,
        saveUninitialized: false,
        cookie: {httpOnly: true, secure: false},
        store: new SessionKnex({ knex: db, createTable: false, tablename: 'sessions' }),
    }, config.session);

    if (app.get('env') === 'production') {
        app.set('trust proxy', 1); // trust first proxy
        //sessionConfig.cookie.secure = true; // serve secure cookies
    }

    app.use(session(sessionConfig));

    const issuer = await OIDCIssuer.discover('XXXX'); // => Promise

    console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata);
    const client = new issuer.Client({
        client_id: 'XXXX',
        client_secret: 'XXXX',
        redirect_uris: ['http://localhost:4001/auth/openid/return'],
        response_types: ['code'],
    });

    passport.use('openid', new OIDCStrategy(
        {
            client,
            params: { scope: 'profile openid email' }
        },
        async function(tokenSet: TokenSet, userinfo: UserinfoResponse, done: any) {
            try {
                if (tokenSet.expired()) {
                    return done(null, false);
                }

                const claims = tokenSet.claims();
                console.log('Token claims:');
                console.log(claims);
                console.log('User info:');
                console.log(userinfo);
                console.log('Auth token:');
                console.log(tokenSet.access_token);

                const user = await getEntityWithCreds('openid', claims.unique_name as string, null);
                if (!user) {
                    return done(null, false);
                }

                return done(null, user);
            } catch (e) {
                return done(e);
            }
        }));


    passport.use(new LocalStrategy(async function(username, password, done) {
        try {
            const user = await getEntityWithCreds('local', username, password);
            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (e) {
            return done(e);
        }
    }));
    passport.use(new BearerStrategy(async function(token, done) {
        try {
            const tokenParts = token.split(':');
            if (tokenParts.length !== 2) {
                return done(null, false);
            }

            const id = Buffer.from(tokenParts[0], 'base64').toString('utf8');
            const secret = Buffer.from(tokenParts[1], 'base64').toString('utf8');

            const user = await getEntityWithCreds('bearer', id, secret);
            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (e) {
            return done(e);
        }
    }));

    // This can be used to keep a smaller payload
    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    // ...
    app.use(passport.initialize());
    app.use(passport.session());



    // Accept the OpenID identifier and redirect the user to their OpenID
    // provider for authentication.  When complete, the provider will redirect
    // the user back to the application at:
    //     /auth/openid/return
    app.get('/auth/openid', passport.authenticate('openid'));

    // The OpenID provider has redirected the user back to the application.
    // Finish the authentication process by verifying the assertion.  If valid,
    // the user will be logged in.  Otherwise, authentication has failed.
    app.get('/auth/openid/return',
        passport.authenticate('openid', { failureRedirect: '/' }),
        (req, res) => {
            res.cookie('ilc:userInfo', JSON.stringify(req.user));
            res.redirect('/');
        });

    app.get('/auth/myinfo', (req, res) => {
        if (req.user) {
            return res.json(req.user);
        }

        return res.sendStatus(401);
    });

    app.post('/login', passport.authenticate(['local']), (req, res) => {
        res.cookie('ilc:userInfo', JSON.stringify(req.user));
        res.send('ok');
    });

    app.get('/logout', function(req, res){
        req.logout();
        res.clearCookie('ilc:userInfo');
        res.redirect('/');
    });

    return (req: any, res: any, next: any) => {
        if (!req.user) {
            return passport.authenticate('bearer', { session: false })(req, res, next);
        }

        return next();
    };
}

async function getEntityWithCreds(provider: string, identifier: string, secret: string|null):Promise<object|null> {
    const user = await db.select().from('auth_entities')
        .first('identifier', 'role', 'secret')
        .where({
            provider,
            identifier
        });
    if (!user) {
        return null;
    }

    if (secret !== null || user.secret !== null) { //Support of the password less auth methods, like OpenID Connect
        if (!await bcrypt.compare(secret, user.secret)) {
            return null;
        }
    }

    delete user.secret;

    return user;
}
