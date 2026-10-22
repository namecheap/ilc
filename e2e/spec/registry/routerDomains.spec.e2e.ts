Feature('Registry admin UI: router domains');

Before(({ login }) => login('registryAdmin'));

function uniqueDomain(name: string) {
    return `${name}.example.com`;
}

Scenario('creates a router domain', ({ I, registryPage }) => {
    const domainName = uniqueDomain(registryPage.uniqueName('domain'));
    I.deleteRegistryRecordsAfterTest('router_domains', { domainName }, 'id');

    registryPage.open('router_domains/create');
    I.fillField('Domain name', domainName);
    registryPage.selectOption('template500', '500');
    I.fillField('Alias', 'e2e-alias');
    registryPage.save();
    registryPage.seeNotification('Element created');

    registryPage.open('router_domains');
    I.waitForElement(registryPage.row(domainName), 10);
    I.see('500', registryPage.row(domainName));
    I.see('e2e-alias', registryPage.row(domainName));
});

Scenario('edits a router domain', async ({ I, registryPage }) => {
    const domainName = uniqueDomain(registryPage.uniqueName('domain'));
    await I.haveRegistryRecord('router_domains', { domainName, template500: '500' }, 'id');

    registryPage.open('router_domains');
    registryPage.editRow(domainName);
    I.fillField('Canonical Domain', 'www.example.com');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    I.waitForElement(registryPage.row(domainName), 10);
    I.see('www.example.com', registryPage.row(domainName));
});

Scenario('deletes a router domain', async ({ I, registryPage }) => {
    const domainName = uniqueDomain(registryPage.uniqueName('domain'));
    const { id } = await I.haveRegistryRecord('router_domains', { domainName, template500: '500' }, 'id');

    registryPage.open('router_domains');
    registryPage.editRow(domainName);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('router_domains', id as number);
});
