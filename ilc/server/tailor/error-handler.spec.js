const chai = require('chai');
const sinon = require('sinon');

const errorHandlerSetup = require('./error-handler');
const errors = require('./errors');

describe('error handler', () => {
    const request = {
        originalUrl: 'originalUrl',
    };

    const error = new Error('error');
    const eventHandlers = new Map();

    const tailorInstance = {
        on: sinon.stub().callsFake((eventName, eventHandler) => {
            eventHandlers.set(eventName, eventHandler);
        }),
    };
    const errorHandlingService = {
        handleError: sinon.stub(),
        noticeError: sinon.spy(),
    };

    let clock;

    beforeEach(() => {
        errorHandlerSetup(tailorInstance, errorHandlingService);

        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        eventHandlers.clear();
        errorHandlingService.handleError.reset();
        errorHandlingService.noticeError.resetHistory();

        clock.restore();
    });

    describe('handling general Tailor and primary fragment errors', () => {
        it('should notice Tailor Error when headers already sent', async () => {
            eventHandlers.get('error')(request, error);

            await clock.runAllAsync();

            chai.expect(errorHandlingService.noticeError.calledOnce).to.be.true;
            chai.expect(errorHandlingService.noticeError.getCall(0).args).to.be.eql([
                new errors.TailorError({
                    message: `Tailor error while headers already sent while processing request "${request.originalUrl}"`,
                    cause: error,
                }),
            ]);
        });

        it('should notice Tailor Error when something went wrong during error handling', async () => {
            const response = {};
            const somethingWentWrongDuringErrorHandling = new Error('something went wrong during error handling');

            errorHandlingService.handleError.onFirstCall().rejects(somethingWentWrongDuringErrorHandling);
            eventHandlers.get('error')(request, error, response);

            await clock.runAllAsync();

            chai.expect(errorHandlingService.noticeError.calledOnce).to.be.true;
            chai.expect(errorHandlingService.noticeError.getCall(0).args).to.be.eql([
                new errors.TailorError({
                    message: 'Something went terribly wrong during error handling',
                    cause: somethingWentWrongDuringErrorHandling,
                }),
            ]);
        });

        it('should handle Tailor Error when headers did not send yet and error handling is going to be successful', async () => {
            const response = {};

            errorHandlingService.handleError.onFirstCall().resolves();
            eventHandlers.get('error')(request, error, response);

            await clock.runAllAsync();

            chai.expect(errorHandlingService.noticeError.called).to.be.false;
            chai.expect(errorHandlingService.handleError.getCall(0).args).to.be.eql([
                new errors.TailorError({
                    message: `Tailor error while processing request "${request.originalUrl}"`,
                    cause: error,
                }),
                request,
                response,
            ]);
        });
    });

    describe('handling non-primary fragment errors', () => {
        it('should notice Fragment Error when an error thew from a non-primary fragment', () => {
            const fragmentAttrs = {
                primary: false,
                id: 'id',
            };

            eventHandlers.get('fragment:error')(request, fragmentAttrs, error);

            chai.expect(errorHandlingService.noticeError.calledOnce).to.be.true;
            chai.expect(errorHandlingService.noticeError.getCall(0).args).to.be.eql([
                new errors.FragmentError({
                    message: `Non-primary "${fragmentAttrs.id}" fragment error while processing "${request.originalUrl}"`,
                    cause: error,
                    data: {
                        fragmentAttrs,
                    },
                }),
            ]);
        });

        it('should not notice Fragment Error when an error thew from a primary fragment', () => {
            const fragmentAttrs = {
                primary: true,
            };

            eventHandlers.get('fragment:error')(request, fragmentAttrs, error);

            chai.expect(errorHandlingService.noticeError.called).to.be.false;
        });
    });

    describe('handling non-primary fragment warnings', () => {
        it('should notice Fragment Warn', () => {
            const fragmentAttrs = {
                primary: false,
            };

            eventHandlers.get('fragment:warn')(request, fragmentAttrs, error);

            chai.expect(errorHandlingService.noticeError.getCall(0).args).to.be.eql([
                new errors.FragmentWarn({
                    message: `Non-primary "${fragmentAttrs.id}" fragment warning while processing "${request.originalUrl}"`,
                    cause: error,
                    data: {
                        fragmentAttrs,
                    },
                }),
            ]);
        });
    });
});
