const { parse, HTMLElement } = require('node-html-parser');

class TemplateParser {
    /**
     *
     * @param {String} html
     * @returns {Element}
     */
    parse(html) {
        return { element: parse(html) };
    }

    /**
     *
     * @param {Element} parent
     * @param {String} tag
     * @returns {Element | undefined}
     */
    getElementByTag(parent, tag) {
        const node = parent.element.childNodes.find((x) => x instanceof HTMLElement && x.tagName === tag.toUpperCase());
        return node && { element: node };
    }
}
module.exports = {
    TemplateParser,
};
