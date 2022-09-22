import chai from 'chai';
import sinon from 'sinon';
import IlcEvents from '../constants/ilcEvents';

chai.use(require('chai-as-promised'));
const expect = chai.expect;

import ErrorHandlerManager from './ErrorHandlerManager';

describe('ErrorHandlerManager', () => {

    const noticeError = sinon.stub();

    window.newrelic = {
        noticeError,
    };

    const registryService = {
        getTemplate: sinon.stub().returns(Promise.resolve({
            data: '%ERRORID%',
        })),
        preheat: sinon.stub().returns(Promise.resolve()),
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

    it('should call registry service preheat', async () => {
        new ErrorHandlerManager(logger, registryService);
        expect(registryService.preheat.called).to.be.true;

        await clock.runAllAsync();

        expect(logger.log.calledWith('ILC: Registry service preheated successfully')).to.be.true;
    });

    it('should error if preheat failed', async() => {
        const preheatError = new Error('Preheat error');

        const registryService = {
            preheat: sinon.stub().returns(Promise.reject(preheatError)),
        };

        new ErrorHandlerManager(logger, registryService);
        await clock.runAllAsync();

        const noticeErrorArgs = noticeError.getCall(0).args;

        expect(noticeErrorArgs[0]).to.equal(preheatError);
        expect(noticeErrorArgs[1].errorId).to.be.a('string');

        const logErrorArgs = logger.error.getCall(0).args;

        const parsedLogArgs = JSON.parse(logErrorArgs[0]);
        expect(parsedLogArgs).to.include({
            type: 'Error',
            message: 'Preheat error',
        });

        expect(parsedLogArgs.stack).deep.equal(preheatError.stack.split('\n'));
        expect(logErrorArgs[1]).to.be.eql(preheatError);
    });

    describe('methods', () => {
        let errorHandlerManager;

        beforeEach(() => {
            errorHandlerManager = new ErrorHandlerManager(logger, registryService);
        });

        describe('internal error', () => {
            it('should correctly log and notice', () => {
                const error = new Error('I am internal error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.internalError(error, info);

                const noticeErrorArgs = noticeError.getCall(0).args;

                expect(noticeErrorArgs[0]).to.equal(error);
                expect(noticeErrorArgs[1].errorId).to.be.a('string');
                expect(noticeErrorArgs[1].type).to.equal('INTERNAL_ERROR');
                expect(noticeErrorArgs[1].blah).to.equal('test');

                const logErrorArgs = logger.error.getCall(0).args;
                const parsedLogArgs = JSON.parse(logErrorArgs[0]);
        
                expect(parsedLogArgs).to.include({
                    type: 'Error',
                    message: 'I am internal error',
                });

                expect(parsedLogArgs.stack).deep.equal(error.stack.split('\n'));

                expect(logErrorArgs[1]).to.be.eql(error);
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                const error = new Error('I am internal error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.internalError(error, info);
                await clock.runAllAsync();

                expect( document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                const error = new Error('I am internal error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.internalError(error, info);
                await clock.runAllAsync();

                errorHandlerManager.internalError(error, info);
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

                const error = new Error('I am internal error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.internalError(error, info);
                await clock.runAllAsync();
                await clock.runAllAsync();

                expect(noticeError.getCalls().length).to.equal(2);
                expect(logger.error.getCalls().length).to.equal(2);

                const noticeErrorArgs = noticeError.getCall(1).args;

                expect(noticeErrorArgs[0]).to.equal(fetchError);
                expect(noticeErrorArgs[1].errorId).to.be.a('string');
                expect(noticeErrorArgs[1].type).to.equal('FETCH_PAGE_ERROR');

                const logErrorArgs = logger.error.getCall(1).args;
                const parsedLogArgs = JSON.parse(logErrorArgs[0]);
        
                expect(parsedLogArgs).to.include({
                    type: 'Error',
                    message: 'Fetch error',
                });

                expect(parsedLogArgs.stack).deep.equal(fetchError.stack.split('\n'));

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;
            });
        });

        it('runtime error should correctly log and notice', async () => {
            const error = new Error('I am runtime error');
            const info = {
                blah: 'test'
            };

            errorHandlerManager.runtimeError(error, info);

            const noticeErrorArgs = noticeError.getCall(0).args;

            expect(noticeErrorArgs[0]).to.equal(error);
            expect(noticeErrorArgs[1].errorId).to.be.a('string');
            expect(noticeErrorArgs[1].type).to.equal('MODULE_ERROR');
            expect(noticeErrorArgs[1].blah).to.equal('test');

            const logErrorArgs = logger.error.getCall(0).args;
            const parsedLogArgs = JSON.parse(logErrorArgs[0]);
    
            expect(parsedLogArgs).to.include({
                type: 'Error',
                message: 'I am runtime error',
            });

            expect(parsedLogArgs.stack).deep.equal(error.stack.split('\n'));

            expect(logErrorArgs[1]).to.be.eql(error);
        });

        it('fragment error should correctly log and notice', async () => {
            const error = new Error('I am fragment error');
            const info = {
                blah: 'test'
            };

            errorHandlerManager.fragmentError(error, info);

            const noticeErrorArgs = noticeError.getCall(0).args;

            expect(noticeErrorArgs[0]).to.equal(error);
            expect(noticeErrorArgs[1].errorId).to.be.a('string');
            expect(noticeErrorArgs[1].type).to.equal('FRAGMENT_ERROR');
            expect(noticeErrorArgs[1].blah).to.equal('test');

            const logErrorArgs = logger.error.getCall(0).args;
            const parsedLogArgs = JSON.parse(logErrorArgs[0]);
    
            expect(parsedLogArgs).to.include({
                type: 'Error',
                message: 'I am fragment error',
            });

            expect(parsedLogArgs.stack).deep.equal(error.stack.split('\n'));

            expect(logErrorArgs[1]).to.be.eql(error);
        });

        describe('critical fragment error', () => {
            it('should correctly log and notice', () => {
                const error = new Error('I am critical fragment error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.criticalFragmentError(error, info);

                const noticeErrorArgs = noticeError.getCall(0).args;

                expect(noticeErrorArgs[0]).to.equal(error);
                expect(noticeErrorArgs[1].errorId).to.be.a('string');
                expect(noticeErrorArgs[1].type).to.equal('CRITICAL_FRAGMENT_ERROR');
                expect(noticeErrorArgs[1].blah).to.equal('test');

                const logErrorArgs = logger.error.getCall(0).args;
                const parsedLogArgs = JSON.parse(logErrorArgs[0]);
        
                expect(parsedLogArgs).to.include({
                    type: 'Error',
                    message: 'I am critical fragment error',
                });

                expect(parsedLogArgs.stack).deep.equal(error.stack.split('\n'));

                expect(logErrorArgs[1]).to.be.eql(error);
            });

            it('should crash ilc', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                const error = new Error('I am critical fragment error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.criticalFragmentError(error, info);
                await clock.runAllAsync();

                expect(document.querySelector('html').innerHTML).to.have.string('Error ID: ');
                expect(handler.called).to.be.true;
            });

            it('should crash ilc once and log info', async () => {
                const handler = sinon.stub();
                window.addEventListener(IlcEvents.CRASH, handler);

                const error = new Error('I am critical fragment error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.criticalFragmentError(error, info);
                await clock.runAllAsync();

                errorHandlerManager.internalError(error, info);
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

                const error = new Error('I am critical fragment error');
                const info = {
                    blah: 'test'
                };

                errorHandlerManager.criticalFragmentError(error, info);
                await clock.runAllAsync();
                await clock.runAllAsync();

                expect(noticeError.getCalls().length).to.equal(2);
                expect(logger.error.getCalls().length).to.equal(2);

                const noticeErrorArgs = noticeError.getCall(1).args;

                expect(noticeErrorArgs[0]).to.equal(fetchError);
                expect(noticeErrorArgs[1].errorId).to.be.a('string');
                expect(noticeErrorArgs[1].type).to.equal('FETCH_PAGE_ERROR');

                const logErrorArgs = logger.error.getCall(1).args;
                const parsedLogArgs = JSON.parse(logErrorArgs[0]);
        
                expect(parsedLogArgs).to.include({
                    type: 'Error',
                    message: 'Fetch error',
                });

                expect(parsedLogArgs.stack).deep.equal(fetchError.stack.split('\n'));

                expect(document.querySelector('html').innerHTML).not.to.have.string('Error ID: ');
                expect(handler.called).to.be.false;
            });
        });
    });
});
