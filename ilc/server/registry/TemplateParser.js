const { parse } = require('node-html-parser');

class TemplateParser {
    /**
     *
     * @param {String} html
     * @returns {TemplateParser}
     */
    parse(html) {
        this.html = html;
        this.dom = parse(html);
        return this;
    }

    /**
     *
     * @param {String} selector
     * @returns {object}
     */
    querySelector(selector) {
        return this.dom?.querySelector(selector);
    }
}
module.exports = {
    TemplateParser,
};
