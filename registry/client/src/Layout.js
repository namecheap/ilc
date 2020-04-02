import React from 'react';
import { Layout, AppBar, UserMenu } from 'react-admin';

const MyUserMenu = props => (
    <UserMenu {...props}>
    </UserMenu>
);


const MyAppBar = props =>
    <AppBar {...props} userMenu={<MyUserMenu />}/>

export default props => <Layout {...props} appBar={MyAppBar} />;
