import { expect } from 'chai';
import { ResourceStylesheet } from './ResourceStylesheet';

describe('ResourceStylesheet', () => {
    it('should correctly render style tag if no attributes provided', () => {
        const stylesheet = new ResourceStylesheet('http://example.com');

        expect(stylesheet.toHtml()).to.equal('<link rel="stylesheet" href="http://example.com">');
        expect(stylesheet.toString()).to.equal('<link rel="stylesheet" href="http://example.com">');
    });

    it('should correctly render style tag if attributes provided and values allowed', () => {
        const stylesheet = new ResourceStylesheet('http://example.com', {
            crossorigin: 'anonymous',
            title: 'blah',
            integrity: 'some',
        });

        expect(stylesheet.toHtml()).to.equal(
            '<link rel="stylesheet" href="http://example.com" crossorigin="anonymous" title="blah" integrity="some">',
        );
        expect(stylesheet.toString()).to.equal(
            '<link rel="stylesheet" href="http://example.com" crossorigin="anonymous" title="blah" integrity="some">',
        );
    });

    it('should skip attribute if value is not allowed provided', () => {
        const stylesheet = new ResourceStylesheet('http://example.com', {
            crossorigin: 'not-allowed',
        });

        expect(stylesheet.toHtml()).to.equal('<link rel="stylesheet" href="http://example.com">');
        expect(stylesheet.toString()).to.equal('<link rel="stylesheet" href="http://example.com">');
    });

    it('should skip not allowed attributes', () => {
        const stylesheet = new ResourceStylesheet('http://example.com', {
            crossorigin: 'anonymous',
            title: 'blah',
            integrity: 'some',
            notallowed: 'notallowed',
        });

        expect(stylesheet.toHtml()).to.equal(
            '<link rel="stylesheet" href="http://example.com" crossorigin="anonymous" title="blah" integrity="some">',
        );
        expect(stylesheet.toString()).to.equal(
            '<link rel="stylesheet" href="http://example.com" crossorigin="anonymous" title="blah" integrity="some">',
        );
    });
});
