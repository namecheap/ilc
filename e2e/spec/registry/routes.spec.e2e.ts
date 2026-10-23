Feature('Registry admin UI: routes');

Before(({ login }) => login('registryAdmin'));

function uniqueRoute(name: string) {
    return `/${name}/*`;
}

Scenario('creates a route with a slot', async ({ I, registryPage }) => {
    const route = uniqueRoute(registryPage.uniqueName('route'));
    I.deleteRegistryRecordsAfterTest('route', { route }, 'id');

    registryPage.open('route/create');
    I.fillField('Route', route);
    registryPage.selectOption('templateName', 'master');
    registryPage.openTab('Slots');
    I.click('Add');
    I.fillField('Slot name', 'body');
    registryPage.pickAutocompleteOption('App name', '@portal/news');
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('route');
    I.waitForElement(registryPage.row(route), 10);
    I.see('master', registryPage.row(route));
    registryPage.showRow(route);
    registryPage.openTab('Slots');
    I.waitForText('@portal/news', 10);
});

Scenario('filters routes by prefix', async ({ I, registryPage }) => {
    const route = uniqueRoute(registryPage.uniqueName('route'));
    await I.haveRegistryRecord('route', { route, next: false, slots: {} }, 'id');

    registryPage.open('route');
    I.waitForElement(registryPage.row('/news/*'), 10);
    I.fillField('Route prefix', route.slice(0, -2));
    I.waitForInvisible(registryPage.row('/news/*'), 10);
    I.seeNumberOfElements('tbody tr', 1);
    I.see(route, 'tbody');
});

Scenario('lists special routes separately', ({ I, registryPage }) => {
    registryPage.open('route');
    I.waitForElement(registryPage.row('/news/*'), 10);
    I.dontSeeElement(registryPage.row('404'));

    I.click('Show special');
    I.waitForElement(registryPage.row('404'), 10);
    I.dontSeeElement(registryPage.row('/news/*'));
});

// The E2E bootstrap starts the Registry with special routes protected (ILC_REGISTRY_ADMIN_PROTECTED_ENTITIES)
Scenario('disables editing of protected special routes', ({ I, registryPage }) => {
    registryPage.open('route');
    I.click('Show special');
    I.waitForElement(registryPage.row('404'), 10);
    I.seeElement(registryPage.disabledButton('Edit'));
    I.dontSeeElement(registryPage.enabledButton('Edit'));

    registryPage.showRow('404');
    I.waitForText('Route #', 10, 'header');
    I.seeElement(registryPage.disabledButton('Edit'));
    I.dontSeeElement(registryPage.enabledButton('Edit'));
});

Scenario('keeps regular routes editable while only special routes are protected', ({ I, registryPage }) => {
    registryPage.open('route');
    I.waitForElement(registryPage.row('/news/*'), 10);
    I.seeElement(registryPage.enabledButton('Edit'));
    I.dontSeeElement(registryPage.disabledButton('Edit'));

    registryPage.showRow('/news/*');
    I.waitForText('Route #', 10, 'header');
    I.seeElement(registryPage.enabledButton('Edit'));
});

Scenario('edits a route', async ({ I, registryPage }) => {
    const route = uniqueRoute(registryPage.uniqueName('route'));
    const { id } = await I.haveRegistryRecord('route', { route, next: false, slots: {} }, 'id');

    registryPage.open('route');
    registryPage.editRow(route);
    I.click('Next');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    const updated = await I.grabRegistryRecord('route', id as number);
    I.assertEqual(updated.next, true);
});

Scenario('deletes a route', async ({ I, registryPage }) => {
    const route = uniqueRoute(registryPage.uniqueName('route'));
    const { id } = await I.haveRegistryRecord('route', { route, next: false, slots: {} }, 'id');

    registryPage.open('route');
    registryPage.editRow(route);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('route', id as number);
});
