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

export default (app: Express, settingsService: SettingsService, config: any): RequestHandler => {
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
            SettingKeys.BaseUrl,
            SettingKeys.AuthOpenIdResponseMode,
            SettingKeys.AuthOpenIdIdentifierClaimName,
            SettingKeys.AuthOpenIdUniqueIdentifierClaimName,
            SettingKeys.AuthOpenIdRequestedScopes,
        ];
        if (await settingsService.hasChanged(callerId, keysToWatch)) {
            console.log('Change of the OpenID authentication config detected. Reinitializing auth backend...');
            passport.unuse('openid');

            const issuer = await OIDCIssuer.discover(await settingsService.get(SettingKeys.AuthOpenIdDiscoveryUrl, callerId)); // => Promise

            //console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata);
            const client = new issuer.Client({
                client_id: await settingsService.get(SettingKeys.AuthOpenIdClientId, callerId),
                client_secret: await settingsService.get(SettingKeys.AuthOpenIdClientSecret, callerId),
                redirect_uris: [urljoin(await settingsService.get(SettingKeys.BaseUrl, callerId), '/auth/openid/return')],
                response_types: ['code'],
            });

            passport.use('openid', new OIDCStrategy(
                {
                    client,
                    params: {
                        scope: await settingsService.get(SettingKeys.AuthOpenIdRequestedScopes, callerId),
                        response_mode: await settingsService.get(SettingKeys.AuthOpenIdResponseMode, callerId),
                    }
                },
                async function(tokenSet: TokenSet/*, userinfo: UserinfoResponse*/, done: any) {
                    try {
                        if (tokenSet.expired()) {
                            return done(null, false, { message: 'Expired OpenID token' });
                        }

                        const claims = tokenSet.claims();
                        const idClaimName = await settingsService.get(SettingKeys.AuthOpenIdIdentifierClaimName, callerId);
                        const uidClaimName = await settingsService.get(SettingKeys.AuthOpenIdUniqueIdentifierClaimName, callerId);

                        let identifiers: string[] = claims[idClaimName] as any;
                        if (!identifiers) {
                            return done(null, false, { message: 'Can\'t find user identifier using IdentityClaimName' });
                        } else if (!Array.isArray(identifiers)) {
                            identifiers = [identifiers];
                        }

                        let user: any;
                        for (let id of identifiers) {
                            user = await getEntityWithCreds('openid', id, null);
                            if (user) {
                                break;
                            }
                        }

                        if (!user) {
                            return done(null, false, { message: `Can\'t find presented identifiers "${identifiers.toString()}" in auth entities list` });
                        }
                        if (uidClaimName && claims[uidClaimName]) {
                            user.identifier = claims[uidClaimName];
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


    const openidReturnHandlers: RequestHandler[] = [
        async (req, res, next) => {
            if (await settingsService.get(SettingKeys.AuthOpenIdEnabled) === true) {
                return next();
            }

            res.sendStatus(404);
        },
        (req, res, next) => {
            passport.authenticate('openid', function(err, user, info) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    res.status(401);
                    res.header('Content-type', 'text/html');
                    return res.end(`<pre>${info.message}</pre><br><a href="/">Go to main page</a>`);
                }
                req.logIn(user, function(err) {
                    if (err) {
                        return next(err);
                    }

                    res.cookie('ilc:userInfo', JSON.stringify(user));
                    return res.redirect('/');
                });
            })(req, res, next);
        }
    ];
    // The OpenID provider has redirected the user back to the application.
    // Finish the authentication process by verifying the assertion.  If valid,
    // the user will be logged in.  Otherwise, authentication has failed.
    app.get('/auth/openid/return', openidReturnHandlers); //Regular flow
    app.post('/auth/openid/return', openidReturnHandlers); //response_mode: 'form_post' flow

    // Accept passed username/password pair & perform an attempt to authenticate against local DB
    app.post('/auth/local', passport.authenticate(['local']), (req, res) => {
        res.cookie('ilc:userInfo', JSON.stringify(req.user));
        res.send('ok');
    });

    app.get('/auth/logout', (req, res, next) => {
        req.logout();
        res.clearCookie('ilc:userInfo');

        if (req.session) {
            req.session.regenerate((err) => {
                if (err) {
                    next(err);
                }
                res.redirect('/');
            });
        } else {
            res.redirect('/');
        }
    });

    app.get('/auth/available-methods', async (req, res) => {
        const availableMethods = ['local'];

        if (await settingsService.get(SettingKeys.AuthOpenIdEnabled) === true) {
            availableMethods.push('openid');
        }

        res.json(availableMethods);
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
        .first('identifier', 'id', 'role', 'secret')
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

    return {
        authEntityId: user.id,
        identifier: user.identifier,
        role: user.role,
    };
}
