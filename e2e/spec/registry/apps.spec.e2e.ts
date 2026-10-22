import { locate } from 'codeceptjs';

import { registryUrl } from '../helpers/registryEnv';

Feature('Registry admin UI: apps');

Before(({ login }) => login('registryAdmin'));

Scenario('creates an app', ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    I.deleteRegistryRecordsAfterTest('app', { name });

    registryPage.open('app');
    I.click('Create');
    I.fillField('Name', name);
    registryPage.selectOption('kind', 'Regular');
    I.fillField('Admin notes', 'Created by the E2E suite');
    registryPage.openTab('Assets');
    I.fillField('Spa bundle', 'http://localhost:8239/e2e/single_spa.js');
    registryPage.openTab('SSR');
    I.fillField('URL', 'http://localhost:8239/e2e/fragment');
    I.fillField('Request timeout, in ms', '1500');
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('app');
    registryPage.showRow(name);
    I.waitForText(`App "${name}"`, 10, 'header');
    I.see('Regular');
    I.see('Created by the E2E suite');
    registryPage.openTab('Assets');
    I.see('http://localhost:8239/e2e/single_spa.js');
    registryPage.openTab('SSR');
    I.see('http://localhost:8239/e2e/fragment');
    I.see('1500');
});

Scenario('requires an SPA bundle unless an assets discovery URL is set', ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    const unavailableAssetsDiscoveryUrl = `${registryUrl}/e2e/missing-assets-discovery`;
    I.deleteRegistryRecordsAfterTest('app', { name });

    registryPage.open('app/create');
    I.fillField('Name', name);
    registryPage.selectOption('kind', 'Primary');
    registryPage.save();
    registryPage.seeNotification('The form is not valid');
    registryPage.openTab('Assets');
    I.see('Required');

    I.fillField('Assets discovery url', unavailableAssetsDiscoveryUrl);
    I.seeElement(locate('input').withAttr({ name: 'spaBundle', disabled: '' }));
    I.see('Do not need to specify SPA bundle');
    registryPage.save();
    registryPage.seeNotification(`${unavailableAssetsDiscoveryUrl} is not available`);
});

Scenario('edits an app', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('app', { name, kind: 'primary', spaBundle: 'http://localhost:8239/e2e/single_spa.js' });

    registryPage.open('app');
    registryPage.editRow(name);
    I.waitForText(`App "${name}"`, 10, 'header');
    registryPage.selectOption('kind', 'Essential');
    I.fillField('Namespace', 'e2e');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    I.waitForElement(registryPage.row(name), 10);
    I.see('essential', registryPage.row(name));
});

Scenario('deletes an app', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('app', { name, kind: 'primary', spaBundle: 'http://localhost:8239/e2e/single_spa.js' });

    registryPage.open('app');
    registryPage.editRow(name);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('app', name);
});

Scenario('filters apps by name', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('@portal/app');
    await I.haveRegistryRecord('app', { name, kind: 'primary', spaBundle: 'http://localhost:8239/e2e/single_spa.js' });

    registryPage.open('app');
    I.see('@portal/news');
    I.fillField('Name', name);
    I.waitForInvisible(registryPage.row('@portal/news'), 10);
    I.seeNumberOfElements('tbody tr', 1);
    I.see(name, 'tbody');
});
