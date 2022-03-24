import db from '../../db';
import Template, { LocalizedTemplate } from '../interfaces';
import { tables } from '../../db/structure';

export async function readTemplateWithAllVersions(templateName: string) {
    const [template] = await db.select().from<Template>(tables.templates).where('name', templateName);
    if (!template) {
        return undefined;
    }

    const localizedTemplates = await db.select().from<LocalizedTemplate>(tables.templatesLocalized).where('templateName', templateName);
    template.localizedVersions = localizedTemplates.reduce((acc, item) => {
        acc[item.locale] = { content: item.content };
        return acc;
    }, {});

    return template;
}
