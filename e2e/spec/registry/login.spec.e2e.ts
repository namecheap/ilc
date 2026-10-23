import { registryUsers } from '../helpers/registryEnv';

Feature('Registry admin UI: login');

Scenario('redirects an anonymous user to the login page', ({ I, registryPage }) => {
    registryPage.open('app');
    I.waitInUrl('#/login', 10);
    I.seeElement(registryPage.button('Sign in'));
    I.dontSeeElement(registryPage.profileButton);
});

Scenario('rejects a wrong password', ({ I, registryPage }) => {
    registryPage.open('login');
    I.fillField('Username', registryUsers.admin.username);
    I.fillField('Password', 'wrong-password');
    I.click('Sign in');
    registryPage.seeNotification('Unauthorized');
    I.seeInCurrentUrl('#/login');
});

Scenario('logs in with a local user and out again', ({ I, registryPage }) => {
    registryPage.login(registryUsers.admin);
    I.see('Apps', 'header');

    I.click(registryPage.profileButton);
    I.see(`${registryUsers.admin.username} ("admin" access)`);
    I.click('Logout');
    I.waitInUrl('#/login', 10);

    registryPage.open('app');
    I.waitInUrl('#/login', 10);
});
