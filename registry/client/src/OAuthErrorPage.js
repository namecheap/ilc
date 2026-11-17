import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import LockIcon from '@material-ui/icons/Lock';
import { useLocation } from 'react-router-dom';

// The same look as the react-admin Login page, without its redirect of a signed-in user to the dashboard
const useStyles = makeStyles((theme) => ({
    main: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: '1px',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundImage: 'radial-gradient(circle at 50% 14em, #313264 0%, #00023b 60%, #00023b 100%)',
    },
    card: {
        minWidth: 300,
        maxWidth: 400,
        marginTop: '6em',
    },
    avatar: {
        margin: '1em',
        display: 'flex',
        justifyContent: 'center',
    },
    icon: {
        backgroundColor: theme.palette.secondary[500],
    },
    button: {
        width: '100%',
    },
}));

/**
 * Shown by /oauth/authorize when the request cannot be sent back to the client: a wrong client or redirect URI,
 * nothing to continue, or a scoped session trying to authorize. The error comes in the hash query.
 */
const OAuthErrorPage = (props) => {
    const classes = useStyles(props);
    const query = new URLSearchParams(useLocation().search);
    const error = query.get('error') || 'invalid_request';
    const description = query.get('error_description');

    return (
        <div className={classes.main}>
            <Card className={classes.card}>
                <div className={classes.avatar}>
                    <Avatar className={classes.icon}>
                        <LockIcon />
                    </Avatar>
                </div>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Authorization failed
                    </Typography>
                    <Typography variant="body2" color="error">
                        <code>{error}</code>
                        {description && ` ${description}`}
                    </Typography>
                </CardContent>
                <CardActions>
                    <Button variant="contained" color="primary" href="#/login" className={classes.button}>
                        Go to the login page
                    </Button>
                </CardActions>
            </Card>
        </div>
    );
};

export default OAuthErrorPage;
