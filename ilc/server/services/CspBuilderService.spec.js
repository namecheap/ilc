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
    it('should pass csp header with correct value', async () => {
        const csp = new CspBuilderService(cspConfigFull);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce, true);
        chai.expect(res.setHeader.getCall(0).args[0], 'content-security-policy-report-only');
        chai.expect(res.setHeader.getCall(0).args[1], 'default-src https://test.com; script-src https://script.com; report-uri /a/b');
    });

    it('should pass strict csp header with correct value', async () => {
        const csp = new CspBuilderService(cspConfigFull, true);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.calledOnce, true);
        chai.expect(res.setHeader.getCall(0).args[0], 'content-security-policy');
        chai.expect(res.setHeader.getCall(0).args[1], 'default-src https://test.com; script-src https://script.com; report-uri /a/b');
    });

    it('should not csp header when csp config is absent', async () => {
        const csp = new CspBuilderService(null, true);
        const res = {
            setHeader: () => {}
        };

        sinon.spy(res, 'setHeader');

        csp.setHeader(res);

        chai.expect(res.setHeader.called, false);
    });
});
