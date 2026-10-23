Feature('Registry admin UI: shared props');

Before(({ login }) => login('registryAdmin'));

const propsLabel = 'Properties that will be passed to applications';

Scenario('creates shared props', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('props');
    I.deleteRegistryRecordsAfterTest('shared_props', { name });

    registryPage.open('shared_props/create');
    I.fillField('Name', name);
    registryPage.fillJsonField(propsLabel, { apiUrl: 'https://api.example.com' });
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('shared_props');
    registryPage.showRow(name);
    I.waitForText(name, 10, 'header');
    I.see('apiUrl');
    I.see('https://api.example.com');
});

Scenario('edits shared props', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('props');
    await I.haveRegistryRecord('shared_props', { name, props: { apiUrl: 'https://api.example.com' } });

    registryPage.open('shared_props');
    registryPage.editRow(name);
    registryPage.fillJsonField(propsLabel, { apiUrl: 'https://api.example.org', retries: 3 });
    registryPage.save();
    registryPage.seeNotification('Element updated');

    const record = await I.grabRegistryRecord('shared_props', name);
    I.assertDeepEqual(record.props, { apiUrl: 'https://api.example.org', retries: 3 });
});

Scenario('passes shared props to an app through its config selector', async ({ I, registryPage }) => {
    const propsName = registryPage.uniqueName('props');
    const appName = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('shared_props', { name: propsName, props: {} });
    await I.haveRegistryRecord('app', { name: appName, kind: 'primary', spaBundle: 'http://localhost:8239/e2e.js' });

    registryPage.open('app');
    registryPage.editRow(appName);
    registryPage.openTab('Props');
    registryPage.pickAutocompleteOption('Shared props selector', propsName);
    registryPage.save();
    registryPage.seeNotification('Element updated');

    I.waitForElement(registryPage.row(appName), 10);
    I.see(propsName, registryPage.row(appName));
});

Scenario('deletes shared props', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('props');
    await I.haveRegistryRecord('shared_props', { name, props: {} });

    registryPage.open('shared_props');
    registryPage.editRow(name);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('shared_props', name);
});
