export const types = {
    url: 'url',
    boolean: 'boolean',
    string: 'string',
    stringArray: 'string[]',
    enum: 'enum',
    password: 'password',
    json: 'json',
};

const PROTECTED_SETTINGS = process.env.PROTECTED_SETTINGS?.split(',') ?? [];

export function transformGet(setting) {
    setting.id = setting.key;

    if (setting.meta && setting.meta.type === types.enum) {
        setting.meta.choices = setting.meta.choices.map((choice) => ({
            id: choice,
            name: choice,
        }));
    }

    if (setting.default === undefined) {
        setting.default = null;
    }

    if (setting.value === undefined) {
        setting.value = null;
    }

    setting.domainId = setting.domainId || null;
    setting.protected = PROTECTED_SETTINGS.includes(setting.key);
}

export function transformSet(setting) {
    if (setting.protected) {
        throw new Error(`The '${setting.key}' setting cannot be modified through UI`);
    }
    if (setting.value === null) {
        setting.value = '';
    }

    for (const key in setting) {
        if (key === 'value' || key === 'key' || key === 'domainId') {
            continue;
        }

        delete setting[key];
    }
}
