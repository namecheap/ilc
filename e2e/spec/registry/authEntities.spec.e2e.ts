Feature('Registry admin UI: auth entities');

Before(({ login }) => login('registryAdmin'));

Scenario('creates a local user who can then log in', ({ I, registryPage }) => {
    const identifier = registryPage.uniqueName('user');
    const password = registryPage.uniqueName('password');
    I.deleteRegistryRecordsAfterTest('auth_entities', { identifier }, 'id');

    registryPage.open('auth_entities/create');
    I.fillField('Identifier', identifier);
    registryPage.selectOption('provider', 'Local');
    registryPage.selectOption('role', 'Readonly');
    I.fillField('Secret', password);
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('auth_entities');
    I.waitForElement(registryPage.row(identifier), 10);
    I.see('readonly', registryPage.row(identifier));

    I.clearCookie();
    registryPage.login({ username: identifier, password });
    I.click(registryPage.profileButton);
    I.see(`${identifier} ("readonly" access)`);
});

Scenario('changes the role of an auth entity', async ({ I, registryPage }) => {
    const identifier = registryPage.uniqueName('user');
    await I.haveRegistryRecord(
        'auth_entities',
        { identifier, provider: 'local', role: 'readonly', secret: 'e2e-secret' },
        'id',
    );

    registryPage.open('auth_entities');
    registryPage.editRow(identifier);
    registryPage.selectOption('role', 'Admin');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    I.waitForElement(registryPage.row(identifier), 10);
    I.see('admin', registryPage.row(identifier));
});

Scenario('deletes an auth entity', async ({ I, registryPage }) => {
    const identifier = registryPage.uniqueName('user');
    const { id } = await I.haveRegistryRecord(
        'auth_entities',
        { identifier, provider: 'local', role: 'readonly', secret: 'e2e-secret' },
        'id',
    );

    registryPage.open('auth_entities');
    registryPage.editRow(identifier);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('auth_entities', id as number);
});
