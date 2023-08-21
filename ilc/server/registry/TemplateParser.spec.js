const { expect } = require('chai');
const { TemplateParser } = require('./TemplateParser');

describe('Template parser', () => {
    it('should parse html', () => {
        const parser = new TemplateParser();
        expect(parser.parse('<html><body></body></html>')).to.be.instanceOf(TemplateParser)
    });

    it('should find html node', () => {
        const parser = new TemplateParser().parse('<html><body></body></html>');
        expect(parser.querySelector('body')).to.be.an('object');
    });

    it('should not find missing html node', () => {
        const parser = new TemplateParser().parse('<html><body></body></html>');
        expect(parser.querySelector('head')).to.be.a('null');
    });
});
