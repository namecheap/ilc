const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const CspBuilderService = require('./CspBuilderService');

const cspConfigFull = {
    defaultSrc: ['https://test.com'],
    connectSrc: ['https://connect.com'],
    scriptSrc: ['https://script.com'],
    styleSrc: ['https://style.com'],
    fontSrc: ['https://font.com'],
    imgSrc: ['https://img.com'],
    workerSrc: ['https://worker.com'],
    frameSrc: ['https://frame.com'],
    reportUri: '/a/b',
    mediaSrc: ['https://media.com'],
    childSrc: ['https://child.com'],
    formAction: ['https://form.com'],
    manifestSrc: ['https://manifest.com'],
    objectSrc: ['https://object.com'],
    scriptSrcAttr: ['https://scriptattr.com'],
    scriptSrcElem: ['https://scriptelem.com'],
    baseUri: ['https://base.com'],
    frameAncestors: ['https://ancestors.com'],
    sandbox: ['allow-scripts'],
    upgradeInsecureRequests: true,
};

describe('CSP builder', () => {
    it('should pass csp header with correct value', () => {
        const csp = new CspBuilderService(cspConfigFull);
        const res = {
            setHeader: () => {},
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy-report-only');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq(
            'default-src https://test.com; connect-src https://connect.com; script-src https://script.com; style-src https://style.com; font-src https://font.com; img-src https://img.com; worker-src https://worker.com; frame-src https://frame.com; media-src https://media.com; child-src https://child.com; form-action https://form.com; manifest-src https://manifest.com; object-src https://object.com; script-src-attr https://scriptattr.com; script-src-elem https://scriptelem.com; base-uri https://base.com; frame-ancestors https://ancestors.com; sandbox allow-scripts; upgrade-insecure-requests; report-uri /a/b',
        );
    });

    it('should pass strict csp header with correct value', () => {
        const csp = new CspBuilderService(cspConfigFull, true);
        const res = {
            setHeader: () => {},
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq(
            'default-src https://test.com; connect-src https://connect.com; script-src https://script.com; style-src https://style.com; font-src https://font.com; img-src https://img.com; worker-src https://worker.com; frame-src https://frame.com; media-src https://media.com; child-src https://child.com; form-action https://form.com; manifest-src https://manifest.com; object-src https://object.com; script-src-attr https://scriptattr.com; script-src-elem https://scriptelem.com; base-uri https://base.com; frame-ancestors https://ancestors.com; sandbox allow-scripts; upgrade-insecure-requests; report-uri /a/b',
        );
    });

    it('should not pass csp header when csp config is absent', () => {
        const csp = new CspBuilderService(null, true);
        const res = {
            setHeader: () => {},
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.called).to.be.false;
    });

    it('should add localhost to csp in case of local development', () => {
        const csp = new CspBuilderService(cspConfigFull, true, true, ['https://localhost:*', 'b']);
        const res = {
            setHeader: () => {},
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq(
            'default-src https://test.com https://localhost:* b; connect-src https://connect.com https://localhost:* b; script-src https://script.com https://localhost:* b; style-src https://style.com https://localhost:* b; font-src https://font.com https://localhost:* b; img-src https://img.com https://localhost:* b; worker-src https://worker.com https://localhost:* b; frame-src https://frame.com https://localhost:* b; media-src https://media.com https://localhost:* b; child-src https://child.com https://localhost:* b; form-action https://form.com https://localhost:* b; manifest-src https://manifest.com https://localhost:* b; object-src https://object.com https://localhost:* b; script-src-attr https://scriptattr.com https://localhost:* b; script-src-elem https://scriptelem.com https://localhost:* b; base-uri https://base.com https://localhost:* b; frame-ancestors https://ancestors.com https://localhost:* b; sandbox allow-scripts https://localhost:* b; upgrade-insecure-requests; report-uri /a/b',
        );
    });
});
