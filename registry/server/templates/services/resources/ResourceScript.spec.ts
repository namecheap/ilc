import { expect } from 'chai';
import { ResourceScript } from './ResourceScript';

describe('ResourceScript', () => {
    it('should correctly render style tag if no attributes provided', () => {
        const stylesheet = new ResourceScript('http://example.com');

        expect(stylesheet.toHtml()).to.equal('<script src="http://example.com"></script>');
        expect(stylesheet.toString()).to.equal('<script src="http://example.com"></script>');
    });

    it('should correctly render style tag if attributes provided and values allowed', () => {
        const stylesheet = new ResourceScript('http://example.com', {
            crossorigin: 'anonymous',
            integrity: 'some',
            type: 'javascript',
            nonce: 'somenonce',
            nomodule: 'nomodule',
            async: 'async',
            defer: 'defer',
            referrerpolicy: 'no-referrer',
        });

        const expectedTag =
            '<script src="http://example.com" crossorigin="anonymous" integrity="some" type="javascript"' +
            ' nonce="somenonce" nomodule async defer referrerpolicy="no-referrer"></script>';

        expect(stylesheet.toHtml()).to.equal(expectedTag);
        expect(stylesheet.toString()).to.equal(expectedTag);
    });

    it('should skip attribute if value is not allowed provided', () => {
        const stylesheet = new ResourceScript('http://example.com', {
            crossorigin: 'not-allowed',
        });

        expect(stylesheet.toHtml()).to.equal('<script src="http://example.com"></script>');
        expect(stylesheet.toString()).to.equal('<script src="http://example.com"></script>');
    });

    it('should skip not allowed attributes', () => {
        const stylesheet = new ResourceScript('http://example.com', {
            crossorigin: 'anonymous',
            integrity: 'some',
            type: 'javascript',
            nonce: 'somenonce',
            nomodule: 'nomodule',
            async: 'async',
            defer: 'defer',
            referrerpolicy: 'no-referrer',
            notallowed: 'notallowed',
        });

        const expectedTag =
            '<script src="http://example.com" crossorigin="anonymous" integrity="some" type="javascript"' +
            ' nonce="somenonce" nomodule async defer referrerpolicy="no-referrer"></script>';

        expect(stylesheet.toHtml()).to.equal(expectedTag);
        expect(stylesheet.toString()).to.equal(expectedTag);
    });
});
