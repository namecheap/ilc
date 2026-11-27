import { Button, CardActions, CardContent, LinearProgress, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Login, LoginForm } from 'react-admin';
import { useLocation } from 'react-router-dom';

/** The ways to sign in that the Registry has enabled: "local", "openid" */
async function fetchAvailableMethods({ signal }: { signal: AbortSignal }): Promise<string[]> {
    const response = await fetch('/auth/available-methods', { signal });
    if (!response.ok) {
        throw new Error(response.statusText);
    }

    return response.json();
}

export function LoginPage() {
    const methods = useQuery({ queryKey: ['auth', 'availableMethods'], queryFn: fetchAvailableMethods });
    // "Login with OpenID" leaves the page for the provider
    const [leaving, setLeaving] = useState(false);
    // /oauth/authorize sends an unauthenticated user here with the client it continues after the login
    const query = new URLSearchParams(useLocation().search);
    const oauthClient = query.get('client');
    const oauthScope = query.get('scope');

    // react-admin keeps the identity and the access rights it has read. Whoever signs in here may be
    // someone else, e.g. after the session cookie expired or was dropped in another tab
    const queryClient = useQueryClient();
    useEffect(() => {
        queryClient.removeQueries({ queryKey: ['auth', 'getIdentity'] });
        queryClient.removeQueries({ queryKey: ['auth', 'canAccess'] });
    }, [queryClient]);

    // The Back button brings the page back from the browser's back/forward cache as it was left,
    // so the progress bar has to be taken off again
    useEffect(() => {
        function showLoginMethods(event: PageTransitionEvent) {
            if (event.persisted) {
                setLeaving(false);
            }
        }

        window.addEventListener('pageshow', showLoginMethods);
        return () => window.removeEventListener('pageshow', showLoginMethods);
    }, []);

    if (methods.isPending || leaving) {
        return (
            <Login>
                <CardContent>
                    <LinearProgress />
                </CardContent>
            </Login>
        );
    }

    if (methods.isError) {
        return (
            <Login>
                <CardContent>
                    <Typography color="error">Unable to load the login methods: {methods.error.message}</Typography>
                </CardContent>
            </Login>
        );
    }

    return (
        <Login>
            {oauthClient && (
                // As wide as the login form below, or the card grows with the text
                <Typography variant="body2" color="textSecondary" sx={{ paddingX: 2, maxWidth: 300 }}>
                    Signing in continues the authorization of <code>{oauthClient}</code> with scopes{' '}
                    <code>{oauthScope}</code>
                </Typography>
            )}
            {methods.data.includes('openid') && (
                <CardActions>
                    <Button
                        variant="contained"
                        color="secondary"
                        href="/auth/openid"
                        fullWidth
                        onClick={() => setLeaving(true)}
                    >
                        Login with OpenID
                    </Button>
                </CardActions>
            )}
            {methods.data.includes('local') && <LoginForm />}
        </Login>
    );
}
