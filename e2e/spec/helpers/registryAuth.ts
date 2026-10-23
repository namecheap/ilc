import { secret } from 'codeceptjs';

import { registryUrl, registryUsers } from './registryEnv';

type RegistryUser = { username: string; password: string };

const profileButton = 'button[aria-label="Profile"]';

// Takes the actor as a parameter, so that the auth plugin config can use it before the container injects support objects
export function loginToRegistry(I: CodeceptJS.I, { username, password }: RegistryUser) {
    I.amOnPage(`${registryUrl}/#/login`);
    I.fillField('Username', username);
    I.fillField('Password', secret(password));
    I.click('Sign in');
    I.waitForElement(profileButton, 10);
}

// The default restore opens "/" first, which is ILC, while the session belongs to the Registry
function restoreRegistrySession(I: CodeceptJS.I, cookies: unknown) {
    I.amOnPage(`${registryUrl}/ping`);
    I.setCookie(cookies as CodeceptJS.Cookie[]);
}

function checkRegistrySession(I: CodeceptJS.I) {
    I.amOnPage(registryUrl);
    I.waitForElement(profileButton, 10);
}

/**
 * Users of the auth plugin: it logs in once per user and restores the session cookies in later tests.
 */
export const registryAuthUsers = {
    registryAdmin: {
        login: (I: CodeceptJS.I) => loginToRegistry(I, registryUsers.admin),
        restore: restoreRegistrySession,
        check: checkRegistrySession,
    },
    registryReadonly: {
        login: (I: CodeceptJS.I) => loginToRegistry(I, registryUsers.readonly),
        restore: restoreRegistrySession,
        check: checkRegistrySession,
    },
};
