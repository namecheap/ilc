const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const CspBuilderService = require('./CspBuilderService');

const cspConfigFull = {
    defaultSrc: ['https://test.com'],
    scriptSrc: ['https://script.com'],
    reportUri: '/a/b'
}

describe('CSP builder', () => {
    it('should pass csp header with correct value', () => {
        const csp = new CspBuilderService(cspConfigFull);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy-report-only');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq('default-src https://test.com; script-src https://script.com; report-uri /a/b');
    });

    it('should pass strict csp header with correct value',  () => {
        const csp = new CspBuilderService(cspConfigFull, true);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq('default-src https://test.com; script-src https://script.com; report-uri /a/b');
    });

    it('should not pass csp header when csp config is absent', () => {
        const csp = new CspBuilderService(null, true);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.called).to.be.false;
    });

    it('should add localhost to csp in case of local development', () => {
        const csp = new CspBuilderService(cspConfigFull, true, true);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce).to.be.true;
        chai.expect(res.setHeader.getCall(0).args[0]).to.be.eq('content-security-policy');
        chai.expect(res.setHeader.getCall(0).args[1]).to.be.eq( 'default-src https://test.com https://localhost:*; script-src https://script.com https://localhost:*; report-uri /a/b');
    });
});
