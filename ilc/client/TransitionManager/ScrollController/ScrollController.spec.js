import { expect } from 'chai';
import { ScrollController } from './ScrollController';
import sinon from 'sinon';

describe('ScrollController', () => {
    let scrollController;
    let testAnchor;

    beforeEach(() => {
        // Create and append a specific element to the body for the test
        testAnchor = document.createElement('div');
        testAnchor.id = 'testAnchor';
        document.body.appendChild(testAnchor);

        scrollController = new ScrollController();
    });

    afterEach(() => {
        // Clean up the DOM by removing the test element after each test
        document.body.removeChild(testAnchor);
        document.body.removeAttribute('ilcTempStoredHash');
        window.location.hash = ''; // Reset the hash
    });

    describe('store', () => {
        it('should store the current window hash when called', () => {
            window.location.hash = '#testAnchor';
            scrollController.store();
            expect(document.body.getAttribute('ilcTempStoredHash')).to.equal('testAnchor');
        });

        it('should not store the hash if it is not present', () => {
            scrollController.store();
            expect(document.body.hasAttribute('ilcTempStoredHash')).to.be.false;
        });
    });

    describe('restore', () => {
        let scrollSpy;
        let scrollIntoViewSpy;

        afterEach(() => {
            if (scrollSpy) {
                scrollSpy.restore();
                scrollSpy = null;
            }

            if (scrollIntoViewSpy) {
                scrollIntoViewSpy.restore();
                scrollIntoViewSpy = null;
            }
        });

        it('should remove the stored hash attribute from the document body', () => {
            document.body.setAttribute('ilcTempStoredHash', 'testAnchor');
            scrollController.restore();
            expect(document.body.hasAttribute('ilcTempStoredHash')).to.be.false;
        });

        it('should scroll to the element associated with the current hash', () => {
            scrollSpy = sinon.spy(window, 'scroll');
            scrollIntoViewSpy = sinon.spy(testAnchor, 'scrollIntoView');

            window.location.hash = '#testAnchor';
            scrollController.restore();

            sinon.assert.calledOnce(testAnchor.scrollIntoView);
            sinon.assert.notCalled(window.scroll);
        });

        it('should scroll to top if no element is associated with the current hash', () => {
            scrollSpy = sinon.spy(window, 'scroll');

            window.location.hash = '#nonExistentAnchor';
            scrollController.restore();

            sinon.assert.calledWith(window.scroll, 0, 0);
        });

        it('should not scroll to top if store has recorded navigation between the same path', () => {
            scrollSpy = sinon.spy(window, 'scroll');
            scrollController.store();
            scrollController.store();

            scrollController.restore();

            sinon.assert.notCalled(window.scroll);
        });

        it('should handle hashes that need to be decoded', () => {
            const encodedHash = '#test%20anchor'; // Encoded "#test anchor"
            document.getElementById('testAnchor').id = 'test anchor';
            window.location.hash = encodedHash;
            scrollIntoViewSpy = sinon.spy(testAnchor, 'scrollIntoView');

            try {
                scrollController.restore();
                sinon.assert.calledOnce(scrollIntoViewSpy);
            } finally {
                document.getElementById('test anchor').id = 'testAnchor';
            }
        });

        it('should safely handle hashes with characters that need escaping', () => {
            // Simulate a hash that needs escaping
            const invalidHash = '#test:id';
            window.location.hash = invalidHash;

            expect(() => scrollController.restore()).to.not.throw();
        });
    });
});
