import { registryUsers } from '../helpers/registryEnv';

Feature('Registry admin UI: read-only access');

Before(({ login }) => login('registryReadonly'));

Scenario('shows records without ways to change them', ({ I, registryPage }) => {
    registryPage.open('app');
    I.waitForElement(registryPage.row('@portal/news'), 10);
    I.click(registryPage.profileButton);
    I.see(`${registryUsers.readonly.username} ("readonly" access)`);
    I.pressKey('Escape');
    // The menu fades out over an invisible backdrop, which would swallow the next click
    I.waitForDetached('[role="menu"]', 10);

    I.dontSeeElement(registryPage.button('Create'));
    I.dontSeeElement(registryPage.button('Edit'));
    I.dontSeeElement('tbody input[type="checkbox"]');

    registryPage.showRow('@portal/news');
    I.waitForText('App "@portal/news"', 10, 'header');
    I.dontSeeElement(registryPage.button('Edit'));
});

Scenario('opens the edit route of a record as a read-only view', ({ I, registryPage }) => {
    registryPage.open(`app/${encodeURIComponent('@portal/news')}`);
    I.waitForText('App "@portal/news"', 10, 'header');
    I.dontSeeElement('button[aria-label="Save"]');
    I.dontSeeElement('input[name="namespace"]');
});

Scenario('hides reverting changes in history', ({ I, registryPage }) => {
    registryPage.open('versioning');
    I.waitForElement('tbody tr', 10);
    I.dontSeeElement(registryPage.button('Revert'));
});
