import { registryUsers } from '../helpers/registryEnv';

Feature('Registry admin UI: history');

Before(({ login }) => login('registryAdmin'));

Scenario('records who changed an entity', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('app', { name, kind: 'primary', spaBundle: 'http://localhost:8239/e2e.js' });

    registryPage.open('app');
    registryPage.editRow(name);
    registryPage.selectOption('kind', 'Regular');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    registryPage.open('versioning');
    registryPage.selectOption('entity_type', 'Apps');
    I.fillField('Entity ID', name);
    I.waitForElement(registryPage.row('UPDATE'), 10);
    I.seeNumberOfElements('tbody tr', 2);
    I.see(registryUsers.admin.username, registryPage.row('UPDATE'));
    I.seeElement(registryPage.row('CREATE'));
});

Scenario('reverts a change', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('app', { name, kind: 'primary', spaBundle: 'http://localhost:8239/e2e.js' });

    registryPage.open('app');
    registryPage.editRow(name);
    registryPage.selectOption('kind', 'Regular');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    registryPage.open('versioning');
    I.fillField('Entity ID', name);
    I.waitForElement(registryPage.row('UPDATE'), 10);
    I.amAcceptingPopups();
    I.click('Revert', registryPage.row('UPDATE'));
    registryPage.seeNotification('Change was successfully reverted');

    const app = await I.grabRegistryRecord('app', name);
    I.assertEqual(app.kind, 'primary');
});
