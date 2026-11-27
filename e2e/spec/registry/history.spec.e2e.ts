import { registryUsers } from '../helpers/registryEnv';

Feature('Registry admin UI: history');

Before(({ login }) => login('registryAdmin'));

// Every record has a second row, which holds its diff once the record is expanded
const historyRecords = 'tbody tr:not(.RaDataTable-expandRow)';

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
    // The list keeps the rows it has while it fetches the filtered ones: the creation and the update of the app
    I.waitNumberOfVisibleElements(historyRecords, 2, 10);
    I.waitForElement(registryPage.row('UPDATE'), 10);
    I.seeNumberOfElements(historyRecords, 2);
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
    // The list keeps the rows it has while it fetches the filtered ones: the creation and the update of the app
    I.waitNumberOfVisibleElements(historyRecords, 2, 10);
    I.waitForElement(registryPage.row('UPDATE'), 10);
    I.click('Revert', registryPage.row('UPDATE'));
    I.click(registryPage.button('Confirm'), registryPage.confirmDialog);
    registryPage.seeNotification('Change was successfully reverted');

    const app = await I.grabRegistryRecord('app', name);
    I.assertEqual(app.kind, 'primary');
});
