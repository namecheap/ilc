const { expect } = require('chai');
const { TemplateParser } = require('./TemplateParser');

describe('Template parser', () => {
    it('should parse html', () => {
        const parser = new TemplateParser();
        const result = parser.parse('<html><body></body></html>');
        expect(result).to.have.property('element');
        expect(result.element).to.be.an('object')
    });

    it('should find html node', () => {
        const parser = new TemplateParser();
        const parsed = parser.parse('<html><body></body></html>');
        expect(parser.getElementByTag(parsed, 'html')).to.be.an('object');
    });

    it('should not find missing html node', () => {
        const parser = new TemplateParser();
        const parsed = parser.parse('<html><body></body></html>');
        expect(parser.getElementByTag(parsed, 'body')).to.be.an('undefined');
    });
});
