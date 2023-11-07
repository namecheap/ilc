import { expect } from 'chai';
import sinon from 'sinon';
import { TransitionBlocker } from './TransitionBlocker';
import { SlotTransitionTimeoutError } from './errors/SlotTransitionTimeoutError';

describe('TransitionBlocker', () => {
    let transitionBlocker;
    let transitionBlockerResolve;
    let transitionBlockerReject;
    let cancelTokenSpy = sinon.spy();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    describe('Transition blocker from function executor', () => {
        beforeEach(() => {
            transitionBlocker = new TransitionBlocker(
                (resolve, reject) => {
                    transitionBlockerResolve = resolve;
                    transitionBlockerReject = reject;
                },
                () => {
                    return cancelTokenSpy();
                },
                {
                    externalId: 'testExternalId',
                },
            );
        });

        it('Should subscribe success fn on then transition blocker promise', () => {
            return new Promise((resolve) => {
                transitionBlocker.then(resolve);
                transitionBlockerResolve();
            });
        });

        it('Should subscribe error fn on then transition blocker promise', () => {
            return new Promise((resolve, reject) => {
                transitionBlocker.then(reject, resolve);
                transitionBlockerReject();
            });
        });

        it('Should subscribe fn on catch transition blocker promise', () => {
            return new Promise((resolve) => {
                transitionBlocker.catch(resolve);
                transitionBlockerReject();
            });
        });

        it('Should return blocker promise as id', () => {
            expect(transitionBlocker.getId()).to.be.equal('testExternalId');
        });

        it('Should set onDestroy callback', () => {
            transitionBlocker.destroy();
            console.log(cancelTokenSpy.callCount);
            expect(cancelTokenSpy.callCount).to.be.equal(1);
        });

        it('Should throw error if blocker executor does not returns a cancel token function function', () => {
            expect(() => {
                new TransitionBlocker(() => {});
            }).to.throw('TransitionBlocker blockerExecutionCancellation must be a function with cancellation callback');
        });

        it('Should reject promise in case of timeout', (done) => {
            const blocker = new TransitionBlocker(
                () => {},
                () => {},
                { timeout: 10, externalId: 'timeout' },
            );
            blocker.catch((error) => {
                expect(error.message).to.be.equal('TransitionBlocker timeout 10ms for blocker timeout');
                done();
            });
        });

        it('Should clear timeout after blocker execution resolved', () => {
            const clearTimeout = sinon.spy(global, 'clearTimeout');

            const blocker = new TransitionBlocker(
                (resolve) => {
                    resolve();
                },
                () => {},
                { timeout: 10 },
            );

            return delay(5).then(() => {
                expect(clearTimeout.callCount).to.be.equal(1);
                clearTimeout.restore();
                return blocker.then(() => {});
            });
        });

        it('Should clear timeout after blocker execution rejected', (done) => {
            const clearTimeout = sinon.spy(global, 'clearTimeout');

            const blocker = new TransitionBlocker(
                (_, reject) => {
                    reject(new Error('test'));
                },
                () => {},
                { timeout: 10 },
            );

            delay(5).then(() => {
                expect(clearTimeout.callCount).to.be.equal(1);
                clearTimeout.restore();
                done();
            });
        });

        it('Should invoke blockerExecutionCancellation callback on destroy', () => {
            const blockerExecutionCancellation = sinon.spy();
            const blocker = new TransitionBlocker(() => {}, blockerExecutionCancellation);
            blocker.destroy();
            expect(blockerExecutionCancellation.callCount).to.be.equal(1);
        });

        it('Should catch error in case of timeout occurs', async () => {
            const rejectHandler = sinon.spy();

            const blocker = new TransitionBlocker(
                (resolve) => {
                    setTimeout(resolve, 200);
                },
                () => {},
                { timeout: 10 },
            );

            blocker.catch(rejectHandler);

            await delay(15);

            expect(rejectHandler.callCount).to.be.equal(1);
            expect(rejectHandler.calledWith(sinon.match.instanceOf(SlotTransitionTimeoutError))).to.be.true;
        });
    });
});
