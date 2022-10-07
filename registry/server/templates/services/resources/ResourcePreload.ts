import { Attributes } from './Attributes';
import { AllowedAttributes, Resource } from './Resource';

export class ResourcePreload extends Resource {
    protected static allowedAttributes: AllowedAttributes = {
        as: ['audio', 'document', 'embed', 'fetch', 'font', 'image', 'object', 'script', 'style', 'track', 'video', 'work'],
        type: null,
        media: null,
        hreflang: null,
        imagesizes: null,
        imagesrcset: null,
        ...Attributes.referrerpolicy,
        ...Resource.allowedAttributes,
    };

    public toHtml(): string {
        const attributesValues = this.getAttributesValues(ResourcePreload.allowedAttributes);
        let attributes = this.buildAttributes(attributesValues);

        return '<link rel="preload" href="' + this.uri + '"' + attributes + '>';
    }
}
