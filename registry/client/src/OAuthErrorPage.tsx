import LockIcon from '@mui/icons-material/Lock';
import { Avatar, Box, Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';

/**
 * Shown by /oauth/authorize when the request cannot be sent back to the client: a wrong client or redirect URI,
 * nothing to continue, or a scoped session trying to authorize. The error comes in the hash query.
 *
 * It has the look of the react-admin Login page, but cannot be one: that redirects a signed-in user to the dashboard.
 */
export function OAuthErrorPage() {
    const query = new URLSearchParams(useLocation().search);
    const error = query.get('error') || 'invalid_request';
    const description = query.get('error_description');

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundImage: 'radial-gradient(circle at 50% 14em, #313264 0%, #00023b 60%, #00023b 100%)',
            }}
        >
            <Card sx={{ minWidth: 300, maxWidth: 400, marginTop: '6em' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', margin: '1em' }}>
                    <Avatar sx={{ backgroundColor: 'secondary.main' }}>
                        <LockIcon />
                    </Avatar>
                </Box>
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
                    <Button variant="contained" color="primary" href="#/login" fullWidth>
                        Go to the login page
                    </Button>
                </CardActions>
            </Card>
        </Box>
    );
}
