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

    const noticeError = sinon.stub();

    window.newrelic = {
        noticeError,
    };

    const registryService = {
        getTemplate: sinon.stub().returns(Promise.resolve({
            data: '%ERRORID%',
        }))
    };

    const logger = {
        log: sinon.spy(),
        info: sinon.spy(),
        error: sinon.spy()
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

        beforeEach(() => {
            errorHandlerManager = new ErrorHandlerManager(logger, registryService);
        });

        it('should correctly log and notice if error is instance of BaseError', async () => {
            const internalError = new InternalError({
                message: 'I am internal error',
                data: {
                    blah: 'test'
                }
            });

            errorHandlerManager.handleError(internalError);

            const noticeErrorArgs = noticeError.getCall(0).args;
            const [noticedError, noticedData] = noticeErrorArgs;

            expect(noticedError).to.equal(internalError);
            expect(noticedData.errorId).to.be.a('string');
            expect(noticedData.code).to.equal('internal');
            expect(noticedData.blah).to.equal('test');

            const [loggedString, loggedError]  = logger.error.getCall(0).args;
            const parsedLogArgs = JSON.parse(loggedString);
    
            expect(parsedLogArgs).to.include({
                type: 'InternalError',
                message: 'I am internal error',
            });

            expect(parsedLogArgs.stack).deep.equal(internalError.stack.split('\n'));
            expect(loggedError).to.be.eql(internalError);
        });

        it('should wrap and correctly log and notice if error is not instance of BaseError', async () => {
            const error = new Error('I am internal error');

            errorHandlerManager.handleError(error);

            const noticeErrorArgs = noticeError.getCall(0).args;
            const [noticedError, noticedData] = noticeErrorArgs;

            expect(noticedError).to.be.an.instanceof(UnhandledError);
            expect(noticedError.message).to.equal('I am internal error');
            expect(noticedData.errorId).to.be.a('string');
            expect(noticedData.code).to.equal('runtime.unhandled');

            const [loggedString, loggedError]  = logger.error.getCall(0).args;
            const parsedLogArgs = JSON.parse(loggedString);
    
            expect(parsedLogArgs).to.include({
                type: 'UnhandledError',
                message: 'I am internal error',
            });

            expect(parsedLogArgs.stack).deep.equal(noticedError.stack.split('\n'));
            expect(loggedError).to.be.eql(noticedError);
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

            it('should correctly log and notice if error is instance of CriticalInternalError', () => {
                errorHandlerManager.handleError(criticalError);

                const noticeErrorArgs = noticeError.getCall(0).args;
                const [noticedError, noticedData] = noticeErrorArgs;

                expect(noticedError).to.equal(criticalError);
                expect(noticedData.errorId).to.be.a('string');
                expect(noticedData.code).to.equal('internal.criticalInternal');
                expect(noticedData.blah).to.equal('test');

                const [loggedString, loggedError]  = logger.error.getCall(0).args;
                const parsedLogArgs = JSON.parse(loggedString);
        
                expect(parsedLogArgs).to.include({
                    type: 'CriticalInternalError',
                    message: 'I am internal error',
                });

                expect(parsedLogArgs.stack).deep.equal(criticalError.stack.split('\n'));

                expect(loggedError).to.be.eql(criticalError);
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect( document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(noticeError.getCalls().length).to.equal(1);
                expect(logger.error.getCalls().length).to.equal(1);

                expect(logger.info.getCalls().length).to.equal(1);
                expect(logger.info.getCall(0).args[0]).to.have.string('Ignoring error as we already crashed...');

                expect( document.querySelector('html').innerHTML).to.have.string('Error ID: ');
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

                expect(noticeError.getCalls().length).to.equal(2);
                expect(logger.error.getCalls().length).to.equal(2);

                const noticeErrorArgs = noticeError.getCall(1).args;
                const [noticedError, noticedData] = noticeErrorArgs;

                expect(noticedError).to.be.an.instanceof(FetchTemplateError);
                expect(noticedError.cause).to.be.equal(fetchError);

                expect(noticedData.errorId).to.be.a('string');
                expect(noticedData.code).to.equal('internal.fetchTemplate');

                const [loggedString]  = logger.error.getCall(1).args;
                const parsedLogArgs = JSON.parse(loggedString);

                expect(parsedLogArgs).to.include({
                    type: 'FetchTemplateError',
                    message: 'Failed to get 500 error template',
                });

                expect(parsedLogArgs.stack).deep.equal(noticedError.stack.split('\n'));

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;
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

            it('should correctly log and notice if error is instance of CriticalRuntimeError', () => {
                errorHandlerManager.handleError(criticalError);

                const noticeErrorArgs = noticeError.getCall(0).args;
                const [noticedError, noticedData] = noticeErrorArgs;

                expect(noticedError).to.equal(criticalError);
                expect(noticedData.errorId).to.be.a('string');
                expect(noticedData.code).to.equal('runtime.criticalRuntime');
                expect(noticedData.blah).to.equal('test');

                const [loggedString, loggedError]  = logger.error.getCall(0).args;
                const parsedLogArgs = JSON.parse(loggedString);
        
                expect(parsedLogArgs).to.include({
                    type: 'CriticalRuntimeError',
                    message: 'I am internal error',
                });

                expect(parsedLogArgs.stack).deep.equal(criticalError.stack.split('\n'));

                expect(loggedError).to.be.eql(criticalError);
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect( document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                errorHandlerManager.handleError(criticalError);
                await clock.runAllAsync();

                expect(noticeError.getCalls().length).to.equal(1);
                expect(logger.error.getCalls().length).to.equal(1);

                expect(logger.info.getCalls().length).to.equal(1);
                expect(logger.info.getCall(0).args[0]).to.have.string('Ignoring error as we already crashed...');

                expect( document.querySelector('html').innerHTML).to.have.string('Error ID: ');
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

                expect(noticeError.getCalls().length).to.equal(2);
                expect(logger.error.getCalls().length).to.equal(2);

                const noticeErrorArgs = noticeError.getCall(1).args;
                const [noticedError, noticedData] = noticeErrorArgs;

                expect(noticedError).to.be.an.instanceof(FetchTemplateError);
                expect(noticedError.cause).to.be.equal(fetchError);

                expect(noticedData.errorId).to.be.a('string');
                expect(noticedData.code).to.equal('internal.fetchTemplate');

                const [loggedString]  = logger.error.getCall(1).args;
                const parsedLogArgs = JSON.parse(loggedString);

                expect(parsedLogArgs).to.include({
                    type: 'FetchTemplateError',
                    message: 'Failed to get 500 error template',
                });

                expect(parsedLogArgs.stack).deep.equal(noticedError.stack.split('\n'));

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;
            });
        });
    });
});
