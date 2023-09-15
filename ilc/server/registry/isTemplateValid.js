const { TemplateParser } = require('./TemplateParser');

module.exports = {
    isTemplateValid(html) {
        const parser = new TemplateParser();
        const root = parser.parse(html);
        const htmlElement = parser.getElementByTag(root, 'html');
        if (!htmlElement) {
            return false;
        }
        return !!(parser.getElementByTag(htmlElement, 'head') && parser.getElementByTag(htmlElement, 'body'));
    },
};
