import { SettingKeys } from '../../settings/interfaces';
import settingsService, { SettingsService } from '../../settings/services/SettingsService';

export class OpenIdService {
    private readonly callerId = OpenIdService.name;

    constructor(private readonly settings: SettingsService) {}

    public async isEnabled(): Promise<boolean> {
        return await this.settings.get<boolean>(SettingKeys.AuthOpenIdEnabled, this.callerId);
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

    public async getConfigValue(key: SettingKeys): Promise<string> {
        return await this.settings.get(key, this.callerId);
    }
}
