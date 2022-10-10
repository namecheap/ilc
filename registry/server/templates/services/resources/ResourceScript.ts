import { Attributes } from './Attributes';
import { AllowedAttributes, Resource } from './Resource';

export class ResourceScript extends Resource {
    protected static allowedAttributes: AllowedAttributes = {
        type: null,
        nonce: null,
        nomodule: ['nomodule'],
        async: ['async'],
        defer: ['defer'],
        ...Attributes.referrerpolicy,
        ...Resource.allowedAttributes,
    };

    public toHtml(): string {
        const attributesValues = this.getAttributesValues(ResourceScript.allowedAttributes);
        const attributes = this.buildAttributes(attributesValues);

        return '<script src="' + this.uri + '"' + attributes + '></script>';
    }
}
