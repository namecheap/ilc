import { expect } from 'chai';
import { SettingsService } from '../../server/settings/services/SettingsService';
import db from '../../server/db';
import { Scope, SettingKeys } from '../../server/settings/interfaces';

describe('SettingsService', () => {
    let settingsService: SettingsService;
    const testDomainId = 4;
    const testTemplate = 'testTemplate';
    const testSetting1 = 'key1';
    const testSetting2 = 'key2';

    beforeEach(() => {
        settingsService = new SettingsService();
    });

    describe('getSettingsForConfig', () => {
        afterEach(async () => {
            await db('settings_domain_value').where('settings_domain_value.key', testSetting1).del();
            await db('router_domains').where('router_domains.id', testDomainId).del();
            await db('templates').where('templates.name', testTemplate).del();
            await db('settings').where('settings.key', testSetting1).del();
            await db('settings').where('settings.key', testSetting2).del();
        });

        it('should merge domain-specific config with general config, giving priority to domain-specific config', async () => {
            // Arrange
            const domainName = Math.random() + 'example.com';

            const generalValue1 = 'generalValue1';
            const generalValue2 = 'generalValue2';
            const domainSpecificValue1 = 'domainSpecificValue1';

            await db('templates').insert({
                name: testTemplate,
                content: '<html><head></head><body>doesnotmatter</body></html>',
            });

            // Insert domain
            await db('router_domains').insert({ id: testDomainId, domainName, template500: testTemplate });

            // Insert general settings
            await db('settings').insert([
                {
                    key: testSetting1 as SettingKeys,
                    value: JSON.stringify(generalValue1),
                    default: JSON.stringify(generalValue1),
                    meta: JSON.stringify({ type: 'string' }),
                    scope: Scope.Ilc,
                    secret: false,
                },
                {
                    key: testSetting2 as SettingKeys,
                    value: JSON.stringify(generalValue2),
                    default: JSON.stringify(generalValue2),
                    meta: JSON.stringify({ type: 'string' }),
                    scope: Scope.Ilc,
                    secret: false,
                },
            ]);

            // Insert domain-specific setting for key1
            await db('settings_domain_value').insert({
                key: testSetting1,
                domainId: testDomainId,
                value: JSON.stringify(domainSpecificValue1),
            });

            const config = await settingsService.getSettingsForConfig(domainName);

            expect(config).to.deep.contain({
                [testSetting1]: domainSpecificValue1,
                [testSetting2]: generalValue2,
            });
        });
    });
});
