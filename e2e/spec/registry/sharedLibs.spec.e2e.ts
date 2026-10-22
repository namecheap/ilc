Feature('Registry admin UI: shared libs');

Before(({ login }) => login('registryAdmin'));

const spaBundle = 'http://localhost:8239/e2e/shared-lib.js';

Scenario('creates a shared lib', ({ I, registryPage }) => {
    const name = registryPage.uniqueName('lib');
    I.deleteRegistryRecordsAfterTest('shared_libs', { name });

    registryPage.open('shared_libs/create');
    I.fillField('Name', name);
    registryPage.openTab('Assets');
    I.fillField('Spa bundle', spaBundle);
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('shared_libs');
    I.waitForElement(registryPage.row(`@sharedLibrary/${name}`), 10);
    I.see(spaBundle, registryPage.row(`@sharedLibrary/${name}`));
});

Scenario('edits a shared lib', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('lib');
    await I.haveRegistryRecord('shared_libs', { name, spaBundle });

    registryPage.open('shared_libs');
    registryPage.editRow(`@sharedLibrary/${name}`);
    I.fillField('Admin notes', 'Edited by the E2E suite');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    registryPage.open('shared_libs');
    registryPage.showRow(`@sharedLibrary/${name}`);
    I.waitForText('Edited by the E2E suite', 10);
});

Scenario('deletes a shared lib', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('lib');
    await I.haveRegistryRecord('shared_libs', { name, spaBundle });

    registryPage.open('shared_libs');
    registryPage.editRow(`@sharedLibrary/${name}`);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('shared_libs', name);
});
