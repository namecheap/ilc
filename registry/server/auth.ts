import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import session from 'express-session';
import sessionKnex from 'connect-session-knex';
import {Express, RequestHandler} from 'express';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import * as bcrypt from 'bcrypt';
import {Issuer as OIDCIssuer, Strategy as OIDCStrategy, TokenSet, UserinfoResponse} from 'openid-client';

import db from './db';
import {SettingsService} from "./settings/services/SettingsService";
import {SettingKeys} from "./settings/interfaces";
import urljoin from 'url-join';

export default async (app: Express, settingsService: SettingsService, config: any): Promise<RequestHandler> => {
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
    app.get('/auth/openid', async (req, res, next) => {
        if (await settingsService.get(SettingKeys.AuthOpenIdEnabled) === false) {
            return res.sendStatus(404);
        }
        if (req.user) {
            return res.redirect('/');
        }

        const callerId = 'auth';
        const keysToWatch = [
            SettingKeys.AuthOpenIdClientId,
            SettingKeys.AuthOpenIdClientSecret,
            SettingKeys.BaseUrl
        ];
        if (await settingsService.hasChanged(callerId, keysToWatch)) {
            console.log('Change of the OpenID authentication config detected. Reinitializing auth backend...');
            passport.unuse('openid');

            const issuer = await OIDCIssuer.discover(await settingsService.get(SettingKeys.AuthOpenIdDiscoveryUrl, callerId)); // => Promise

            console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata);
            const client = new issuer.Client({
                client_id: await settingsService.get(SettingKeys.AuthOpenIdClientId, callerId),
                client_secret: await settingsService.get(SettingKeys.AuthOpenIdClientSecret, callerId),
                redirect_uris: [urljoin(await settingsService.get(SettingKeys.BaseUrl, callerId), '/auth/openid/return')],
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
                })
            );
        }

        next();
    }, passport.authenticate('openid'));

    // The OpenID provider has redirected the user back to the application.
    // Finish the authentication process by verifying the assertion.  If valid,
    // the user will be logged in.  Otherwise, authentication has failed.
    app.get('/auth/openid/return',
        async (req, res, next) => {
            if (await settingsService.get(SettingKeys.AuthOpenIdEnabled) === true) {
                return next();
            }

            res.sendStatus(404);
        },
        passport.authenticate('openid', { failureRedirect: '/' }),
        (req, res) => {
            res.cookie('ilc:userInfo', JSON.stringify(req.user));
            res.redirect('/');
        }
    );

    // Accept passed username/password pair & perform an attempt to authenticate against local DB
    app.post('/auth/local', passport.authenticate(['local']), (req, res) => {
        res.cookie('ilc:userInfo', JSON.stringify(req.user));
        res.send('ok');
    });

    app.get('/auth/logout', function(req, res){
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
