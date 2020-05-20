const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

describe('error handler', () => {
    const errorId = 'errorId';
    const request = {};
    const error = new Error('error');

    const template = {
        data: {
            content:
                '<html>' +
                    '<body>' +
                        '<main>' +
                            '<h1>Hello there!</h1>' +
                            '<div>%ERRORID%</div>' +
                        '</main>' +
                    '</body>' +
                '</html>'
        },
    };

    const uuid = sinon.stub().withArgs().returns(errorId);
    const errorExtender = sinon.stub();
    const noticeError = sinon.spy();
    const response = {
        setHeader: sinon.spy(),
        write: sinon.spy(),
        end: sinon.spy(),
        statusCode: null,
    };
    const registry = {
        getTemplate: sinon.stub(),
    };

    before(() => {
        sinon.spy(global.console, 'error');
    });

    afterEach(() => {
        response.setHeader.resetHistory();
        response.write.resetHistory();
        response.end.resetHistory();
        response.statusCode = null;
        registry.getTemplate.reset();
        noticeError.resetHistory();
        errorExtender.resetHistory();
        uuid.resetHistory();
        global.console.error.resetHistory();
    });

    after(() => {
        global.console.error.restore();
    });

    it('should show 500 error page with an error id', async () => {
        registry.getTemplate.withArgs('500').resolves(template);

        const errorHandler = proxyquire('./index', {
            'uuid/v4': uuid,
            '@namecheap/error-extender': errorExtender,
            './noticeError': noticeError,
            '../registry/factory': registry,
        });

        await errorHandler(error, request, response);

        chai.expect(response.setHeader.calledWithExactly('Cache-Control', 'no-cache, no-store, must-revalidate')).to.be.true;
        chai.expect(response.setHeader.calledWithExactly('Pragma', 'no-cache')).to.be.true;
        chai.expect(response.write.calledOnceWithExactly(
            '<html>' +
                '<body>' +
                    '<main>' +
                        '<h1>Hello there!</h1>' +
                        `<div>Error ID: ${errorId}</div>` +
                    '</main>' +
                '</body>' +
            '</html>'
        )).to.be.true;
        chai.expect(response.statusCode).to.be.eql(500);
        chai.expect(response.end.calledOnceWithExactly()).to.be.true;
        chai.expect(noticeError.calledOnceWithExactly(error, {
            errorId,
        })).to.be.true;
    });

    it('should send an error message when showing 500 error page throws an error', async () => {
        const rejectedError = new Error('rejectedError');

        registry.getTemplate.withArgs('500').rejects(rejectedError);

        class FakeError {
            constructor(...errorData) {
                this.errorData = errorData;
            }
        }

        errorExtender.withArgs('ErrorHandlingError').returns(FakeError);

        const errorHandler = proxyquire('./index', {
            'uuid/v4': uuid,
            '@namecheap/error-extender': errorExtender,
            './noticeError': noticeError,
            '../registry/factory': registry,
        });

        await errorHandler(error, request, {
            res: response,
        });

        chai.expect(global.console.error.calledOnceWithExactly(new FakeError({
            cause: rejectedError,
            d: {
                errorId,
            },
        }))).to.be.true;
        chai.expect(response.setHeader.called).to.be.false;
        chai.expect(response.write.calledOnceWithExactly('Oops! Something went wrong. Pls try to refresh page or contact support.')).to.be.true;
        chai.expect(response.statusCode).to.be.eql(500);
        chai.expect(response.end.calledOnceWithExactly()).to.be.true;
        chai.expect(noticeError.calledOnceWithExactly(error, {
            errorId,
        })).to.be.true;
    });
});
