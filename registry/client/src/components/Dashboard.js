import React from 'react';
import { Title } from 'react-admin';
import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Button } from '@material-ui/core';

export default () => {
    return (
        <>
            <Title title="ILC Registry" />
            <Card>
                <CardContent>
                    <Typography variant="h4">Apps</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Shared props</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Templates</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Routes</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Auth entities</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Settings</Typography>
                    <Typography variant="body2" component="p">Detailed information about list of all settings will be added soon.</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">History</Typography>
                    <Typography variant="body2" component="p">History of all modifications in Registry.</Typography>
                    <Typography variant="body2" component="p">Detailed information will be added soon</Typography>
                </CardContent>
            </Card>
            <br />
            <Card>
                <CardContent>
                    <Typography variant="h4">Router domains</Typography>
                    <Typography variant="body2" component="p">First of all if you use ILC only for one domain name then "Router domains" is unnecessary for you.</Typography>
                    <br />
                    <Typography variant="body2" component="p">ILC supports multi-domains, it means you can use one instance of ILC and Registry for a few domains.</Typography>
                    <Typography variant="body2" component="p">To use it:</Typography>
                    <ol>
                        <li><Typography variant="body2">Go to <Link to="router_domains">Router domains</Link> and create new entities (you can choose default "<Link to="/template/500">500</Link>" template for your domains or <Link to="/template/create">create</Link> new templates for each of them).</Typography></li>
                        <li><Typography variant="body2">Choose domain name during <Link to="/route/create">creation a new route</Link> or update field "Domain" in your existed routes.</Typography></li>
                    </ol>
                </CardContent>
            </Card>
        </>
    )
};
