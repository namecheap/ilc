import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import session from 'express-session';
import sessionKnex from 'connect-session-knex';
import {Express, RequestHandler} from 'express';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import * as bcrypt from 'bcrypt';

import db from './db';

export default (app: Express, config: any): RequestHandler => {
    const SessionKnex = sessionKnex(session);
    const sessionConfig = Object.assign({
        resave: false,
        saveUninitialized: false,
        cookie: {httpOnly: true, secure: false},
        store: new SessionKnex({ knex: db }),
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

    app.post('/login', passport.authenticate(['local']), (req, res) => {
        res.json(req.user);
    });

    app.get('/logout', function(req, res){
        req.logout();
        res.redirect('/');
    });

    return (req: any, res: any, next: any) => {
        if (!req.user) {
            return passport.authenticate('bearer', { session: false })(req, res, next);
        }

        return next();
    };
}

async function getEntityWithCreds(provider: string, identifier: string, secret: string):Promise<object|null> {
    const user = await db.select().from('auth_entities')
        .first('identifier', 'role', 'secret')
        .where({
            provider,
            identifier
        });
    if (!user) {
        return null;
    }
    if (!await bcrypt.compare(secret, user.secret)) {
        return null;
    }

    delete user.secret;

    return user;
}
