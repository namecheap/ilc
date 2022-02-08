import {expect} from 'chai';
import sinon from 'sinon';

import dispatchSynchronizedEvent from './dispatchSynchronizedEvent';

const eventName = 'ilc:intl-update';

let listeners = [];

describe('dispatchSynchronizedEvent', () => {

    beforeEach(() => {
        sinon.resetHistory();
    });

    afterEach(() => {
        listeners.forEach(v => v.unwatch());
        listeners = [];
    });

    it('should handle success case well', async () => {
        const testData = {a: 1, b: 'c'};

        const l1 = createListener();
        const l2 = createListener();
        const errLogger = sinon.spy(console.error);

        const res = dispatchSynchronizedEvent(eventName, testData, errLogger);

        sinon.assert.calledOnceWithExactly(l1.prepare, sinon.match(testData));
        sinon.assert.notCalled(l1.execute);
        sinon.assert.calledOnceWithExactly(l2.prepare, sinon.match(testData));
        sinon.assert.notCalled(l2.execute);
        expect(await promiseState(res)).to.eq('pending');

        const l1PrepResult = 'l1 resolve res';
        l1.resolvePrep(l1PrepResult);
        sinon.assert.notCalled(l1.execute);
        sinon.assert.notCalled(l2.execute);

        const l2PrepResult = 'l2 resolve res';
        l2.resolvePrep(l2PrepResult);
        await waitForAllAsyncActions();
        sinon.assert.calledOnceWithExactly(l1.execute, sinon.match(testData), l1PrepResult);
        sinon.assert.calledOnceWithExactly(l2.execute, sinon.match(testData), l2PrepResult);

        l1.resolveExec();
        await waitForAllAsyncActions();
        expect(await promiseState(res)).to.eq('pending');
        l2.resolveExec();
        await waitForAllAsyncActions();
        expect(await promiseState(res)).to.eq('fulfilled');

        sinon.assert.notCalled(errLogger);
    });

    it('should continue processing listeners which haven\'t failed on preparation stage', async () => {
        const testData = {a: 1, b: 'c'};

        const l1Id = 'l1_id';
        const l1 = createListener(l1Id);
        const l2 = createListener();
        const errLogger = sinon.spy(console.error);

        const res = dispatchSynchronizedEvent(eventName, testData, errLogger);

        const l1PrepResult = 'l1 expected reject res';
        l1.rejectPrep(l1PrepResult); // NOTICE REJECT HERE!
        const l2PrepResult = 'l2 resolve res';
        l2.resolvePrep(l2PrepResult);

        await waitForAllAsyncActions();
        sinon.assert.notCalled(l1.execute); // Because preparation was rejected
        sinon.assert.calledOnceWithExactly(l2.execute, sinon.match(testData), l2PrepResult);

        l2.resolveExec();
        await waitForAllAsyncActions();
        expect(await promiseState(res)).to.eq('fulfilled');

        sinon.assert.calledOnceWithExactly(errLogger, l1Id, l1PrepResult);
    });

    it('should log errors from execution callbacks', async () => {
        const testData = {a: 1, b: 'c'};

        const l1Id = 'l1_id';
        const l1 = createListener(l1Id);
        const l2 = createListener();
        const errLogger = sinon.spy(console.error);

        const res = dispatchSynchronizedEvent(eventName, testData, errLogger);

        l1.resolvePrep();
        l2.resolvePrep();

        await waitForAllAsyncActions();

        const l1ExecResult = 'l1 expected reject res';
        l1.rejectExec(l1ExecResult); // NOTICE REJECT HERE!
        l2.resolveExec();

        await waitForAllAsyncActions();

        expect(await promiseState(res)).to.eq('fulfilled');
        sinon.assert.calledOnceWithExactly(errLogger, l1Id, l1ExecResult);
    })
});


function createListener(actorId = 'testActor') {
    const prepare = sinon.spy(() => new Promise((resolve, reject) => {
        listener.resolvePrep = resolve;
        listener.rejectPrep = reject;
    }));
    const execute = sinon.spy(() => new Promise((resolve, reject) => {
        listener.resolveExec = resolve;
        listener.rejectExec = reject;
    }));

    const listener = {
        resolvePrep: undefined,
        rejectPrep: undefined,
        resolveExec: undefined,
        rejectExec: undefined,
        prepare,
        execute,
        _listener(e) {
            e.detail.addHandler({
                actorId,
                prepare,
                execute,
            });
        },
        unwatch(){
            window.removeEventListener(eventName, this._listener);
        },
    }

    window.addEventListener(eventName, listener._listener);

    listeners.push(listener);

    return listener;
}

function promiseState(p) {
    const t = {};
    return Promise.race([p, t])
        .then(v => (v === t)? "pending" : "fulfilled", () => "rejected");
}

function waitForAllAsyncActions() {
    return new Promise(r => setTimeout(() => r(), 10));
}
