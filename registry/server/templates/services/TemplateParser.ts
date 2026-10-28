import { HTMLElement, parse } from 'node-html-parser';

interface Element {
    readonly element: HTMLElement;
}

export class TemplateParser {
    parse(html: string): Element {
        return { element: parse(html) };
    }

    getElementByTag(parent: Element, tag: string): Element | undefined {
        const node = parent.element.childNodes.find((x) => x instanceof HTMLElement && x.tagName === tag.toUpperCase());
        return node && { element: node as HTMLElement };
    }
}
