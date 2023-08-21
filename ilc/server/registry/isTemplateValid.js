const { TemplateParser } = require('./TemplateParser');

module.exports = {
    isTemplateValid(html) {
        const parser = new TemplateParser().parse(html);
        return parser.querySelector('html') && parser.querySelector('head') && parser.querySelector('body');
    },
};
