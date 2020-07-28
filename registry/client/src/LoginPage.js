import * as React from 'react';
import { Login, LoginForm } from 'react-admin';
import Button from "@material-ui/core/Button";
import CardActions from "@material-ui/core/CardActions/CardActions";
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
    button: {
        width: '100%',
    },
});


const LoginPage = props => {
    const classes = useStyles(props);

    return (
        <Login>
            <LoginForm/>
            <CardActions>
                <Button
                    variant="contained"
                    type="link"
                    color="secondary"
                    href="/auth/openid"
                    className={classes.button}
                >
                    Login with OpenID
                </Button>
            </CardActions>

        </Login>
    );
};

export default LoginPage;
