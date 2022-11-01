import chai from 'chai';
import sinon from 'sinon';
import IlcEvents from '../constants/ilcEvents';

chai.use(require('chai-as-promised'));
const expect = chai.expect;

import ErrorHandlerManager from './ErrorHandlerManager';

import {
    InternalError,
    UnhandledError,
    FetchTemplateError,
    CriticalRuntimeError,
    CriticalInternalError,
} from '../errors';

describe('ErrorHandlerManager', () => {
    const registryService = {
        getTemplate: sinon.stub().returns(Promise.resolve({
            data: '%ERRORID%',
        }))
    };

    const logger = {
        info: sinon.spy(),
        error: sinon.spy(),
        fatal: sinon.spy(),
    };

    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        document.querySelector('html').innerHTML = '';
    });

    afterEach(() => {
        sinon.resetHistory();
        clock.restore();
    });

    describe('handleError', () => {
        let errorHandlerManager;
        let alertStub = sinon.stub(window, 'alert');

        beforeEach(() => {
            errorHandlerManager = new ErrorHandlerManager(logger, registryService);
        });

        it('should log error if error is instance of BaseError', async () => {
            const internalError = new InternalError({
                message: 'I am internal error',
                data: {
                    blah: 'test'
                }
            });

            errorHandlerManager.handleError(internalError);
            expect(logger.error.calledOnceWithExactly('I am internal error', internalError)).to.be.true;
        });

        it('should wrap and log error if error is not instance of BaseError', async () => {
            const error = new Error('I am internal error');

            errorHandlerManager.handleError(error);

            const [loggedMessage, loggedError]  = logger.error.getCall(0).args;

            expect(loggedMessage).to.equal('I am internal error');
            expect(loggedError.cause).to.equal(error);
            expect(loggedError).to.be.instanceOf(UnhandledError);
        });

        describe('critical internal error', () => {
            let criticalError;

            beforeEach(() => {
                criticalError = new CriticalInternalError({
                    message: 'I am internal error',
                    data: {
                        blah: 'test',
                    },
                });
            });

            it('should log fatal if error is instance of CriticalInternalError', () => {
                errorHandlerManager.handleError(criticalError);
                expect(logger.fatal.calledOnceWithExactly('I am internal error', criticalError)).to.be.true;
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(logger.fatal.calledOnceWithExactly('I am internal error', criticalError)).to.be.true;

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(logger.info.getCalls().length).to.equal(1);
                expect(logger.info.getCall(0).args[0]).to.have.string('Ignoring error as we already crashed...');

                expect(document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
                expect(handler.getCalls().length).to.equal(1);
            });

            it('should not crash ilc, log error and alert if template failed to load', async () => {
                const fetchError = new Error('Fetch error');

                const registryService = {
                    preheat: sinon.stub().returns(Promise.resolve()),
                    getTemplate: sinon.stub().returns(Promise.reject(fetchError)),
                };

                errorHandlerManager = new ErrorHandlerManager(logger, registryService);

                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();
                await clock.runAllAsync();

                const [loggedMessage, loggedError] = logger.error.getCall(0).args;
                expect(loggedMessage).to.equal('Failed to get 500 error template');

                expect(loggedError.message).to.equal('Failed to get 500 error template');
                expect(loggedError.cause).to.equal(fetchError);
                expect(loggedError).to.be.instanceOf(FetchTemplateError);

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;

                expect(alertStub.calledOnceWithExactly('Something went wrong! Please try to reload page or contact support.'));
            });
        });

        describe('critical runtime error', () => {
            let criticalError;

            beforeEach(() => {
                criticalError = new CriticalRuntimeError({
                    message: 'I am internal error',
                    data: {
                        blah: 'test',
                    },
                });
            });

            it('should log error if error is instance of CriticalRuntimeError', () => {
                errorHandlerManager.handleError(criticalError);
                expect(logger.fatal.calledOnceWithExactly('I am internal error', criticalError)).to.be.true;
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(logger.fatal.getCalls().length).to.equal(1);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(logger.info.getCalls().length).to.equal(1);
                expect(logger.info.getCall(0).args[0]).to.have.string('Ignoring error as we already crashed...');

                expect(document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
                expect(handler.getCalls().length).to.equal(1);
            });

            it('should not crash ilc, log error and alert if template failed to load', async () => {
                const fetchError = new Error('Fetch error');

                const registryService = {
                    preheat: sinon.stub().returns(Promise.resolve()),
                    getTemplate: sinon.stub().returns(Promise.reject(fetchError)),
                };

                errorHandlerManager = new ErrorHandlerManager(logger, registryService);

                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();
                await clock.runAllAsync();

                const [loggedMessage, loggedError] = logger.error.getCall(0).args;
                expect(loggedMessage).to.equal('Failed to get 500 error template');

                expect(loggedError.message).to.equal('Failed to get 500 error template');
                expect(loggedError.cause).to.equal(fetchError);
                expect(loggedError).to.be.instanceOf(FetchTemplateError);

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;

                expect(alertStub.calledOnceWithExactly('Something went wrong! Please try to reload page or contact support.'));
            });
        });
    });
});
