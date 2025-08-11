import { SettingKeys, SettingValue } from '../../settings/interfaces';
import { SettingsService } from '../../settings/services/SettingsService';

export class OpenIdService {
    private readonly callerId = OpenIdService.name;

    constructor(private readonly settings: SettingsService) {}

    public async isEnabled(): Promise<boolean> {
        const settingValue = await this.settings.get<boolean>(SettingKeys.AuthOpenIdEnabled, this.callerId);
        return !!settingValue;
    }

    public async hasConfigurationChanged(): Promise<boolean> {
        const keysToWatch = [
            SettingKeys.AuthOpenIdClientId,
            SettingKeys.AuthOpenIdClientSecret,
            SettingKeys.BaseUrl,
            SettingKeys.AuthOpenIdResponseMode,
            SettingKeys.AuthOpenIdIdentifierClaimName,
            SettingKeys.AuthOpenIdUniqueIdentifierClaimName,
            SettingKeys.AuthOpenIdRequestedScopes,
        ];
        return await this.settings.hasChanged(this.callerId, keysToWatch);
    }

    public async getConfigValue<T extends SettingValue = SettingValue>(key: SettingKeys): Promise<T | undefined> {
        const settingValue = await this.settings.get<T>(key, this.callerId);
        return settingValue;
    }
}
