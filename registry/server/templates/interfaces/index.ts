export default interface Template {
    name: string;
    content: string;
}

export interface LocalizedTemplateRow {
    templateName: string;
    content: string;
    locale: string;
}

export interface LocalizedVersion {
    content: string;
}

export interface TemplateWithLocalizedVersions extends Template {
    localizedVersions: Record<string, LocalizedVersion>;
}

export type UpdateTemplatePayload = Omit<Template, 'name' | 'localizedVersions'> &
    Partial<Pick<TemplateWithLocalizedVersions, 'localizedVersions'>>;

export type CreateTemplatePayload = Omit<Template, 'localizedVersions'> &
    Partial<Pick<TemplateWithLocalizedVersions, 'localizedVersions'>>;

export type PartialUpdateTemplatePayload = Pick<Template, 'content'>;
