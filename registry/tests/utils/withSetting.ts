import { SettingKeys } from '../../server/settings/interfaces';
import settingsService from '../../server/settings/services/SettingsService';

export async function withSetting(key: SettingKeys, value: any, cb: () => Promise<any>) {
    const previousValue = await settingsService.get(key);

    const testUser = { identifier: 'test-user', role: 'test', authEntityId: 123 };
    await settingsService.set(SettingKeys.I18nSupportedLocales, value, testUser)
    try {
        await cb();
    }
    finally {
        await settingsService.set(SettingKeys.I18nSupportedLocales, previousValue, testUser);
    }
}
