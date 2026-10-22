import { locate } from 'codeceptjs';

Feature('Registry admin UI: templates');

Before(({ login }) => login('registryAdmin'));

const content = '<html><head></head><body><ilc-slot id="body" /></body></html>';
const localizedContent = '<html lang="ua"><head></head><body><ilc-slot id="body" /></body></html>';

Scenario('creates a template with a localized version', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('template');
    I.deleteRegistryRecordsAfterTest('template', { name });

    registryPage.open('template/create');
    I.fillField('Name', name);
    I.fillField('Content', content);
    I.click('Add Locale');
    registryPage.selectOption('lang-select', 'ua-UA');
    I.click('Add Locale', locate('form').withText('Add new Language'));
    registryPage.openTab('ua-UA');
    I.fillField('Content for ua-UA language', localizedContent);
    registryPage.save();
    registryPage.seeNotification('Element created');

    const template = await I.grabRegistryRecord('template', name);
    I.assertEqual(template.content, content);
    I.assertDeepEqual(template.localizedVersions, { 'ua-UA': { content: localizedContent } });
});

Scenario('rejects a template without html, head and body', ({ I, registryPage }) => {
    const name = registryPage.uniqueName('template');
    I.deleteRegistryRecordsAfterTest('template', { name });

    registryPage.open('template/create');
    I.fillField('Name', name);
    I.fillField('Content', '<div>Not a page</div>');
    registryPage.save();
    registryPage.seeNotification('HTML template has invalid structure');
});

Scenario('edits a template', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('template');
    const editedContent = content.replace('<head></head>', '<head><title>Edited</title></head>');
    await I.haveRegistryRecord('template', { name, content });

    registryPage.open('template');
    registryPage.editRow(name);
    // fillField appends to a multiline field that already has a value
    I.clearField('Content');
    I.fillField('Content', editedContent);
    registryPage.save();
    registryPage.seeNotification('Element updated');

    const template = await I.grabRegistryRecord('template', name);
    I.assertEqual(template.content, editedContent);
});

Scenario('deletes a template', async ({ I, registryPage }) => {
    const name = registryPage.uniqueName('template');
    await I.haveRegistryRecord('template', { name, content });

    registryPage.open('template');
    registryPage.editRow(name);
    registryPage.deleteRecord();
    I.dontSeeRegistryRecord('template', name);
});
