const chai = require('chai');
const sinon = require('sinon');

const errorHandlerSetup = require('./error-handler');
const errors = require('./errors');

describe('error handler', () => {
    const request = {
        originalUrl: 'originalUrl',
        headers: {
            'user-agent': 'bot',
        },
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
        it('should force 404 route when Fragment404Response error occurs', async () => {
            const fragment404Error = new errors.Fragment404Response({ message: 'Fragment returned 404' });
            const errorWithFragment404 = new Error('Wrapper error');
            errorWithFragment404.cause = fragment404Error;

            const requestWithIlcState = {
                ...request,
                ilcState: {},
            };
            const response = {};

            tailorInstance.requestHandler = sinon.stub();

            eventHandlers.get('error')(requestWithIlcState, errorWithFragment404, response);

            await clock.runAllAsync();

            // Should set forceSpecialRoute to 404
            chai.expect(requestWithIlcState.ilcState.forceSpecialRoute).to.equal('404');

            // Should call tailor.requestHandler with request and response
            chai.expect(tailorInstance.requestHandler.calledOnce).to.be.true;
            chai.expect(tailorInstance.requestHandler.getCall(0).args).to.be.eql([requestWithIlcState, response]);

            // Should not call error handling services (early return)
            chai.expect(errorHandlingService.handleError.called).to.be.false;
            chai.expect(errorHandlingService.noticeError.called).to.be.false;
        });

        it('should notice Tailor Error when headers already sent', async () => {
            eventHandlers.get('error')(request, error);

            await clock.runAllAsync();

            chai.expect(errorHandlingService.noticeError.calledOnce).to.be.true;
            chai.expect(errorHandlingService.noticeError.getCall(0).args).to.be.eql([
                new errors.TailorError({
                    message: `Tailor error while headers already sent while processing request "${request.originalUrl}"`,
                    cause: error,
                }),
                { userAgent: 'bot' },
                { reportError: true },
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
                {},
                { reportError: true },
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
                {},
                { reportError: true },
            ]);
        });
    });

    describe('handling LDE detection', () => {
        describe('general tailor errors', () => {
            it('should not report errors in LDE environment', () => {
                const ldeRequest = {
                    ...request,
                    ldeRelated: true,
                };

                eventHandlers.get('error')(ldeRequest, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.TailorError),
                    { userAgent: 'bot' },
                    { reportError: false },
                );
            });

            it('should report errors in production environment', () => {
                const prodRequest = {
                    ...request,
                    ldeRelated: false,
                };

                eventHandlers.get('error')(prodRequest, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.TailorError),
                    { userAgent: 'bot' },
                    { reportError: true },
                );
            });
        });

        describe('fragment errors', () => {
            it('should not report fragment errors in LDE environment', () => {
                const ldeRequest = {
                    ...request,
                    ldeRelated: true,
                };
                const fragmentAttrs = {
                    primary: false,
                    id: 'test-fragment',
                };

                eventHandlers.get('fragment:error')(ldeRequest, fragmentAttrs, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.FragmentError),
                    {},
                    { reportError: false },
                );
            });

            it('should report fragment errors in production environment', () => {
                const prodRequest = {
                    ...request,
                    ldeRelated: false,
                };
                const fragmentAttrs = {
                    primary: false,
                    id: 'test-fragment',
                };

                eventHandlers.get('fragment:error')(prodRequest, fragmentAttrs, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.FragmentError),
                    {},
                    { reportError: true },
                );
            });
        });

        describe('fragment warnings', () => {
            it('should not report fragment warnings in LDE environment', () => {
                const ldeRequest = {
                    ...request,
                    ldeRelated: true,
                };
                const fragmentAttrs = {
                    primary: false,
                    id: 'test-fragment',
                };

                eventHandlers.get('fragment:warn')(ldeRequest, fragmentAttrs, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.FragmentWarn),
                    {},
                    { reportError: false },
                );
            });

            it('should report fragment warnings in production environment', () => {
                const prodRequest = {
                    ...request,
                    ldeRelated: false,
                };
                const fragmentAttrs = {
                    primary: false,
                    id: 'test-fragment',
                };

                eventHandlers.get('fragment:warn')(prodRequest, fragmentAttrs, error);

                sinon.assert.calledOnceWithExactly(
                    errorHandlingService.noticeError,
                    sinon.match.instanceOf(errors.FragmentWarn),
                    {},
                    { reportError: true },
                );
            });
        });
    });
});
