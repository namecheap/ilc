import { expect } from 'chai';
import TransitionBlocker from './TransitionBlocker';

describe('TransitionBlocker', () => {
    let transitionBlocker;
    let transitionBlockerResolve;
    let transitionBlockerReject;

    describe('Transition blocker from function executor', () => {
        beforeEach(() => {
            transitionBlocker = new TransitionBlocker((resolve, reject) => {
                transitionBlockerResolve = resolve;
                transitionBlockerReject = reject;
            });
        });

        it('Should return transition blocker raw promise', () => {
            const promise = transitionBlocker.promise();

            expect(promise.onDestroy).to.equal(undefined);
            expect(promise.then).not.to.equal(undefined);
            expect(promise.catch).not.to.equal(undefined);
            expect(promise).to.be.a('promise');
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

        it('Should subscribe fn on finally transition blocker promise', () => {
            return Promise.all([
                new Promise((resolve) => {
                    transitionBlocker.finally(resolve);
                    transitionBlockerResolve();
                }),
                new Promise((resolve) => {
                    transitionBlocker.finally(resolve);
                    transitionBlockerReject();
                }),
            ]);
        });

        it('Should return blocker promise as id', () => {
            expect(transitionBlocker.getId()).to.equal(transitionBlocker.promise());
        });

        it('Should set onDestroy callback', () => {
            return new Promise((resolve) => {
                transitionBlocker.onDestroy(resolve);
                transitionBlocker.destroy();
            });
        });
    });

    describe('Transaction blocker from promise', () => {
        beforeEach(() => {
            const promise = new Promise((resolve, reject) => {
                transitionBlockerResolve = resolve;
                transitionBlockerReject = reject;
            });

            transitionBlocker = new TransitionBlocker(promise);
        });

        it('Should return transition blocker raw promise', () => {
            const promise = transitionBlocker.promise();

            expect(promise.onDestroy).to.equal(undefined);
            expect(promise.then).not.to.equal(undefined);
            expect(promise.catch).not.to.equal(undefined);
            expect(promise).to.be.a('promise');
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

        it('Should subscribe fn on finally transition blocker promise', () => {
            return Promise.all([
                new Promise((resolve) => {
                    transitionBlocker.finally(resolve);
                    transitionBlockerResolve();
                }),
                new Promise((resolve) => {
                    transitionBlocker.finally(resolve);
                    transitionBlockerReject();
                }),
            ]);
        });

        it('Should return blocker promise as id', () => {
            expect(transitionBlocker.getId()).to.equal(transitionBlocker.promise());
        });

        it('Should set onDestroy callback', () => {
            return new Promise((resolve) => {
                transitionBlocker.onDestroy(resolve);
                transitionBlocker.destroy();
            });
        });
    });
});
