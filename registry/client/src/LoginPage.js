import React, { useEffect } from "react";
import { Login, LoginForm } from 'react-admin';
import Button from "@material-ui/core/Button";
import CardActions from "@material-ui/core/CardActions/CardActions";
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';
import { useSafeSetState } from 'ra-core';

const useStyles = makeStyles(theme => ({
    button: {
        width: '100%',
    },
    icon: {
        margin: `${theme.spacing(2)}px auto`,
        display: 'block',
    },
}));


const LoginPage = props => {
    const classes = useStyles(props);
    const [loading, setLoading] = useSafeSetState(true);
    const [availMethods, setAvailMethods] = useSafeSetState([]);

    useEffect(() => {
        fetch('/auth/available-methods')
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
                return response.text();
            }).then(res => {
            setAvailMethods(JSON.parse(res));
            setLoading(false)
        });
    }, []);

    return (
        <Login>
            {loading ? (
                <CircularProgress
                    className={classes.icon}
                    size={28}
                    thickness={4}
                />
            ) : (
                <div>
                    {availMethods.includes('local') && (
                        <LoginForm/>
                    )}
                    {availMethods.includes('openid') && (
                        <CardActions>
                            <Button
                                variant="contained"
                                color="secondary"
                                href="/auth/openid"
                                className={classes.button}
                            >
                                Login with OpenID
                            </Button>
                        </CardActions>
                    )}
                </div>

            )}
        </Login>
    );
};

export default LoginPage;
