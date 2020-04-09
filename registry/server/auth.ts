import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import session from 'express-session';
import sessionKnex from 'connect-session-knex';
import {Express} from 'express';
import {Strategy as BearerStrategy} from 'passport-http-bearer';

import db from './db';

export default (app: Express, config: any) => {
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


    passport.use(new LocalStrategy(
        function(username, password, done) {
            if (username === 'root' && password === 'pwd') {
                return done(null, {username: 'root', role: 'admin'});
            }

            return done(null, false, { message: 'Incorrect username.' });

            // User.findOne({ username: username }, function(err, user) {
            //     if (err) { return done(err); }
            //     if (!user) {
            //         return done(null, false, { message: 'Incorrect username.' });
            //     }
            //     if (!user.validPassword(password)) {
            //         return done(null, false, { message: 'Incorrect password.' });
            //     }
            //     return done(null, user);
            // });
        }
    ));
    passport.use(new BearerStrategy(
        function(token, done) {
            if (token === 'super') {
                console.log('ADMIN IS HERE');
                return done(null, {username: 'root', role: 'admin'});
            }
            return done(null, false);

            // User.findOne({ token: token }, function (err, user) {
            //     if (err) { return done(err); }
            //     if (!user) { return done(null, false); }
            //     return done(null, user, { scope: 'all' });
            // });
        }
    ));

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

    app.use((req, res, next) => {
        if (!req.user) {
            return passport.authenticate('bearer', { session: false })(req, res, next);
        }

        return next();
    });
}
