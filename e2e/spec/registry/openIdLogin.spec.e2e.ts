import { openIdIssuerUrl } from '../helpers/registryEnv';

Feature('Registry admin UI: OpenID login');

Scenario('hides OpenID login while it is disabled', async ({ I, registryPage }) => {
    await I.haveRegistrySetting('auth.openid.enabled', false);

    registryPage.open('login');
    I.waitForElement(registryPage.button('Sign in'), 10);
    I.dontSeeElement(registryPage.button('Login with OpenID'));
});

Scenario('logs in through the OpenID provider', async ({ I, registryPage }) => {
    await I.haveRegistrySetting('auth.openid.discoveryUrl', openIdIssuerUrl);
    await I.haveRegistrySetting('auth.openid.enabled', true);

    registryPage.open('login');
    I.click(registryPage.button('Login with OpenID'));
    I.waitForElement(registryPage.profileButton, 10);
    I.click(registryPage.profileButton);
    I.see('root ("admin" access)');
});

Scenario('rejects an OpenID identity that is not an auth entity', async ({ I, registryPage }) => {
    await I.haveRegistrySetting('auth.openid.discoveryUrl', openIdIssuerUrl);
    await I.haveRegistrySetting('auth.openid.enabled', true);
    // The "sub" claim of the mock provider holds a user that doesn't exist in the Registry
    await I.haveRegistrySetting('auth.openid.idClaimName', 'sub');

    registryPage.open('login');
    I.click(registryPage.button('Login with OpenID'));
    I.waitForText("Can't find presented identifiers", 10);
    I.seeInCurrentUrl('/auth/openid/return');
    I.dontSeeElement(registryPage.profileButton);
});
