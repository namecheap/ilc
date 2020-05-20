const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

describe('notice error', () => {
    const newrelic = {
        noticeError: sinon.spy(),
    };

    const noticeError = proxyquire('./noticeError', {
        'newrelic': newrelic,
    });

    before(() => {
        sinon.spy(global.console, 'error');
    });

    afterEach(() => {
        global.console.error.resetHistory();
        newrelic.noticeError.resetHistory();
    });

    after(() => {
        global.console.error.restore();
    });

    it('should log a noticed error to console and newrelic', () => {
        const error = {
            name: 'name',
            message: 'message',
            stack: '',
        };

        noticeError(error);

        chai.expect(newrelic.noticeError.getCall(0).args).to.be.eql([
            error,
            {},
        ]);
        chai.expect(global.console.error.getCall(0).args).to.be.eql([
            JSON.stringify({
                type: error.name,
                message: error.message,
                stack: [''],
                additionalInfo: {},
            }),
        ]);
    });

    it('should log a noticed error to console and newrelic with additional data when it exists', () => {
        const error = {
            data: {
                property: 'value',
            },
            name: 'name',
            message: 'message',
            stack: 'first\nsecond\nthird',
        };
        const errorInfo = {
            id: 'id',
        };

        noticeError(error, errorInfo);

        chai.expect(newrelic.noticeError.getCall(0).args).to.be.eql([
            error,
            {
                ...errorInfo,
                ...error.data,
            },
        ]);
        chai.expect(global.console.error.getCall(0).args).to.be.eql([
            JSON.stringify({
                type: error.name,
                message: error.message,
                stack: ['first', 'second', 'third'],
                additionalInfo: {
                    ...errorInfo,
                    ...error.data,
                },
            }),
        ]);
    });
});
