import sinon from 'sinon';
import { expect } from 'chai';

import * as resourceScript from './ResourceScript';
import * as resourcePreload from './ResourcePreload';
import * as resourceStylesheet from './ResourceStylesheet';

import { ResourceLinkParser } from './ResourceLinkParser';
import parseLinkHeader from '../parseLinkHeader';

describe('ResourceLinkParser', () => {
    it('should correctly parse link header to resources', () => {
        const resources = ResourceLinkParser.parse(
            'https://example.com/static/main.js; rel=script; crossorigin=anonymous,' +
                'https://example.com/static/main.css;rel=stylesheet;priority=4000,' +
                'https://example.com; rel=preload',
        );

        expect(resources).to.have.lengthOf(3);

        expect(resources[0]).to.be.an.instanceof(resourceScript.ResourceScript);
        expect(resources[1]).to.be.an.instanceof(resourceStylesheet.ResourceStylesheet);
        expect(resources[2]).to.be.an.instanceof(resourcePreload.ResourcePreload);
    });

    it('should skip unexistent rel', () => {
        const resources = ResourceLinkParser.parse(
            'https://example.com/static/main.js; rel=script; crossorigin=anonymous,' +
                'https://example.com/static/main.css;rel=stylesheet;priority=4000,' +
                'https://example.com; rel=unexist,' +
                'https://example.com; rel=preload',
        );

        expect(resources).to.have.lengthOf(3);

        expect(resources[0]).to.be.an.instanceof(resourceScript.ResourceScript);
        expect(resources[1]).to.be.an.instanceof(resourceStylesheet.ResourceStylesheet);
        expect(resources[2]).to.be.an.instanceof(resourcePreload.ResourcePreload);
    });

    describe('correctly pass params', () => {
        let sandbox: sinon.SinonSandbox;

        beforeEach(function () {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('when no attributes', () => {
            const headerLink =
                'https://example.com/static/main.js; rel=script,' +
                'https://example.com/static/main.css; rel=stylesheet,' +
                'https://example.com; rel=preload';

            const resourceScriptStub = sandbox.stub(resourceScript, 'ResourceScript');
            const resourcePreloadStub = sandbox.stub(resourcePreload, 'ResourcePreload');
            const resourceStylesheetStub = sandbox.stub(resourceStylesheet, 'ResourceStylesheet');

            const parsedLinks = parseLinkHeader(headerLink);
            const resources = ResourceLinkParser.parse(headerLink);

            expect(parsedLinks).to.have.lengthOf(3);
            expect(resources).to.have.lengthOf(3);

            expect(resourceScriptStub.calledOnceWithExactly(parsedLinks[0].uri, parsedLinks[0].params)).to.be.true;
            expect(resourceStylesheetStub.calledOnceWithExactly(parsedLinks[1].uri, parsedLinks[1].params)).to.be.true;
            expect(resourcePreloadStub.calledOnceWithExactly(parsedLinks[2].uri, parsedLinks[2].params)).to.be.true;
        });

        it('when attributes exists', () => {
            const headerLink =
                'https://example.com/static/main.js; rel=script; crossorigin=anonymous; invalid=blah,' +
                'https://example.com/static/main.css; rel=stylesheet; media=print; invalid=blah,' +
                'https://example.com; rel=preload; as=track; invalid=blah,';

            const resourceScriptStub = sandbox.stub(resourceScript, 'ResourceScript');
            const resourcePreloadStub = sandbox.stub(resourcePreload, 'ResourcePreload');
            const resourceStylesheetStub = sandbox.stub(resourceStylesheet, 'ResourceStylesheet');

            const parsedLinks = parseLinkHeader(headerLink);
            const resources = ResourceLinkParser.parse(headerLink);

            expect(parsedLinks).to.have.lengthOf(3);
            expect(resources).to.have.lengthOf(3);

            expect(resourceScriptStub.calledOnceWithExactly(parsedLinks[0].uri, parsedLinks[0].params)).to.be.true;
            expect(resourceStylesheetStub.calledOnceWithExactly(parsedLinks[1].uri, parsedLinks[1].params)).to.be.true;
            expect(resourcePreloadStub.calledOnceWithExactly(parsedLinks[2].uri, parsedLinks[2].params)).to.be.true;
        });
    });
});
