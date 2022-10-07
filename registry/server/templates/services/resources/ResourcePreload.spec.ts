import { expect } from 'chai';
import { ResourcePreload } from "./ResourcePreload";

describe('ResourcePreload', () => {
    it('should correctly render style tag if no attributes provided', () => {
        const stylesheet = new ResourcePreload('http://example.com');

        expect(stylesheet.toHtml()).to.equal('<link rel="preload" href="http://example.com">');
        expect(stylesheet.toString()).to.equal('<link rel="preload" href="http://example.com">');
    });

    it('should correctly render style tag if attributes provided and values allowed', () => {
        const stylesheet = new ResourcePreload('http://example.com', {
            as: 'image',
            type: 'script/javascript',
            media: 'print',
            hreflang: 'US-us',
            imagesizes: 'img-sizes',
            imagesrcset: 'img-src-set',
            crossorigin: 'anonymous',
            integrity: 'some',
        });

        const expectedTag = '<link rel="preload" href="http://example.com" as="image" type="script/javascript" media="print" hreflang="US-us"' 
            + ' imagesizes="img-sizes" imagesrcset="img-src-set" crossorigin="anonymous" integrity="some">'; 

        expect(stylesheet.toHtml()).to.equal(expectedTag);
        expect(stylesheet.toString()).to.equal(expectedTag);
    });
    
    it('should skip attribute if value is not allowed provided', () => {
        const stylesheet = new ResourcePreload('http://example.com', {
            crossorigin: 'not-allowed',
        });

        expect(stylesheet.toHtml()).to.equal('<link rel="preload" href="http://example.com">');
        expect(stylesheet.toString()).to.equal('<link rel="preload" href="http://example.com">');
    });

    it('should skip not allowed attributes', () => {
        const stylesheet = new ResourcePreload('http://example.com', {
            as: 'image',
            type: 'script/javascript',
            media: 'print',
            hreflang: 'US-us',
            imagesizes: 'img-sizes',
            imagesrcset: 'img-src-set',
            crossorigin: 'anonymous',
            integrity: 'some',
            notallowed: 'notallowed',
        });

        const expectedTag = '<link rel="preload" href="http://example.com" as="image" type="script/javascript" media="print" hreflang="US-us"' 
        + ' imagesizes="img-sizes" imagesrcset="img-src-set" crossorigin="anonymous" integrity="some">'; 

        expect(stylesheet.toHtml()).to.equal(expectedTag);
        expect(stylesheet.toString()).to.equal(expectedTag);
    });
});
