import { Attributes } from './Attributes';
import { filterObject } from './filterObject';
import { buildAttributes } from './buildAttributes';

export type Params = { [key: string]: string };

export type AllowedAttributeValues = string[];

export type AllowedAttributes = {
    [key: string]: AllowedAttributeValues | null;
};

export abstract class Resource {
    protected params: Params;

    protected static allowedAttributes: AllowedAttributes = {
        ...Attributes.integrity,
        ...Attributes.crossorigin,
        ...Attributes.ilcInstructions,
    };

    constructor(
        public uri: string,
        params?: Params,
    ) {
        this.params = params || {};
    }

    public abstract toHtml(): string;

    protected buildAttributes(params: Params): string {
        const attributes = buildAttributes(params);

        return `${attributes.length ? ' ' : ''}${attributes}`;
    }

    protected getAttributesValues(allowedAttributes: AllowedAttributes): Params {
        return filterObject(this.params, allowedAttributes);
    }

    public toString(): string {
        return this.toHtml();
    }
}
