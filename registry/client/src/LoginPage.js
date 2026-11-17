import React, { useEffect } from 'react';
import { Login, LoginForm } from 'react-admin';
import Button from '@material-ui/core/Button';
import CardActions from '@material-ui/core/CardActions/CardActions';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import { useSafeSetState } from 'ra-core';
import { useLocation } from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
    button: {
        width: '100%',
    },
    icon: {
        margin: `${theme.spacing(2)}px auto`,
        display: 'block',
    },
    oauthClient: {
        padding: `0 ${theme.spacing(2)}px`,
        maxWidth: 300,
    },
}));

const LoginPage = (props) => {
    const classes = useStyles(props);
    const [loading, setLoading] = useSafeSetState(true);
    const [availMethods, setAvailMethods] = useSafeSetState([]);
    // /oauth/authorize sends an unauthenticated user here with the client it continues after the login
    const query = new URLSearchParams(useLocation().search);
    const oauthClient = query.get('client');
    const oauthScope = query.get('scope');

    useEffect(() => {
        fetch('/auth/available-methods')
            .then((response) => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
                return response.text();
            })
            .then((res) => {
                setAvailMethods(JSON.parse(res));
                setLoading(false);
            });
    }, []);

    return (
        <Login>
            {loading ? (
                <CircularProgress className={classes.icon} size={28} thickness={4} />
            ) : (
                <div>
                    {oauthClient && (
                        <Typography variant="body2" color="textSecondary" className={classes.oauthClient}>
                            Signing in continues the authorization of <code>{oauthClient}</code> with scopes{' '}
                            <code>{oauthScope}</code>
                        </Typography>
                    )}
                    {availMethods.includes('openid') && (
                        <CardActions>
                            <Button
                                variant="contained"
                                color="secondary"
                                href="/auth/openid"
                                className={classes.button}
                                onClick={() => setLoading(true)}
                            >
                                Login with OpenID
                            </Button>
                        </CardActions>
                    )}
                    {availMethods.includes('local') && <LoginForm />}
                </div>
            )}
        </Login>
    );
};

export default LoginPage;
