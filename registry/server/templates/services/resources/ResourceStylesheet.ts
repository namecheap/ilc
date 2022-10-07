import { AllowedAttributes, Resource } from './Resource';

export class ResourceStylesheet extends Resource {
    protected static allowedAttributes: AllowedAttributes = {
        title: null,
        media: null,
        ...Resource.allowedAttributes,
    };

    public toHtml(): string {
        const attributesValues = this.getAttributesValues(ResourceStylesheet.allowedAttributes);
        const attributes = this.buildAttributes(attributesValues);

        return '<link rel="stylesheet" href="' + this.uri + '"' + attributes + '>';
    }
}
