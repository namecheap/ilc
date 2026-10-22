Feature('Registry admin UI: settings');

Before(({ login }) => login('registryAdmin'));

// Registry-scoped settings, so that ILC scenarios running later in the same suite aren't affected
const textSetting = 'auth.openid.idClaimName';
const booleanSetting = 'auth.openid.enabled';

Scenario('edits a text setting', async ({ I, registryPage }) => {
    await I.restoreRegistrySettingAfterTest(textSetting);

    registryPage.open('settings');
    registryPage.editRow(textSetting);
    I.waitForElement('textarea[name="value"]', 10);
    I.clearField('Value');
    I.fillField('Value', 'e2e_claim');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    I.waitForElement(registryPage.row(textSetting), 10);
    I.see('e2e_claim', registryPage.row(textSetting));
});

Scenario('toggles a boolean setting', async ({ I, registryPage }) => {
    await I.restoreRegistrySettingAfterTest(booleanSetting);
    const before = await I.grabRegistryRecord('settings', booleanSetting);

    registryPage.open('settings');
    registryPage.editRow(booleanSetting);
    I.waitForElement('input[name="value"][type="checkbox"]', 10);
    I.click('Value');
    registryPage.save();
    registryPage.seeNotification('Element updated');

    const after = await I.grabRegistryRecord('settings', booleanSetting);
    I.assertEqual(after.value, !before.value);
});

Scenario('shows the second page of settings', ({ I, registryPage }) => {
    registryPage.open('settings');
    I.waitForElement(registryPage.row('amdDefineCompatibilityMode'), 10);
    I.click('Next');
    I.waitForInvisible(registryPage.row('amdDefineCompatibilityMode'), 10);
    I.seeElement('tbody tr');
});
