export default interface Template {
    name: string;
    content: string;
}

export interface LocalizedTemplate {
    templateName: string;
    content: string;
    locale: string;
}
