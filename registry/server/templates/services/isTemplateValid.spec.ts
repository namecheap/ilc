import { expect } from 'chai';
import { isTemplateValid } from './isTemplateValid';

describe('isTemplateValid', () => {
    it('should accept a template with html, head and body', () => {
        expect(isTemplateValid('<html><head></head><body></body></html>')).to.be.true;
    });

    it('should accept a full document with doctype, comments, attributes and whitespace', () => {
        const html = `<!DOCTYPE html>
<!-- comment -->
<html lang="en">
    <head><title>Title</title></head>
    <body class="custom">content</body>
</html>
`;
        expect(isTemplateValid(html)).to.be.true;
    });

    it('should accept uppercase tags', () => {
        expect(isTemplateValid('<HTML><HEAD></HEAD><BODY></BODY></HTML>')).to.be.true;
    });

    it('should reject a template without head', () => {
        expect(isTemplateValid('<html><body></body></html>')).to.be.false;
    });

    it('should reject a template without body', () => {
        expect(isTemplateValid('<html><head></head></html>')).to.be.false;
    });

    it('should reject a template without html', () => {
        expect(isTemplateValid('<head></head><body></body>')).to.be.false;
    });

    it('should reject head and body that are not direct children of html', () => {
        expect(isTemplateValid('<html><div><head></head><body></body></div></html>')).to.be.false;
    });

    it('should reject empty and non-HTML content', () => {
        expect(isTemplateValid('')).to.be.false;
        expect(isTemplateValid('just text')).to.be.false;
    });
});
