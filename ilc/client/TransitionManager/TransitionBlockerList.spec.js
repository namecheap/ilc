import chai from 'chai';

import { TransitionBlocker } from './TransitionBlocker';
import TransitionBlockerList from './TransitionBlockerList';

describe('TransitionBlockerList', () => {
    let first, second;
    let transactionBlockerList;

    beforeEach(() => {
        first = new TransitionBlocker(
            (resolve) => {
                resolve();
            },
            () => {},
            { externalId: 'first' },
        );
        second = new TransitionBlocker(
            (resolve) => {
                resolve();
            },
            () => {},
            { externalId: 'second' },
        );

        transactionBlockerList = new TransitionBlockerList();
    });

    it('Should add items to list', () => {
        chai.expect(transactionBlockerList.size()).to.be.equal(0);

        transactionBlockerList.add(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(1);

        transactionBlockerList.add(second);
        chai.expect(transactionBlockerList.size()).to.be.equal(2);
    });

    it('Should add item to list multiple times', () => {
        chai.expect(transactionBlockerList.size()).to.be.equal(0);

        transactionBlockerList.add(first);
        transactionBlockerList.add(first);
        transactionBlockerList.add(first);
        transactionBlockerList.add(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(4);

        transactionBlockerList.add(second);
        transactionBlockerList.add(second);
        transactionBlockerList.add(second);
        chai.expect(transactionBlockerList.size()).to.be.equal(7);
    });

    it('Should remove items from list', () => {
        chai.expect(transactionBlockerList.size()).to.be.equal(0);

        transactionBlockerList.add(first);
        transactionBlockerList.add(second);

        chai.expect(transactionBlockerList.size()).to.be.equal(2);

        transactionBlockerList.remove(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(1);

        transactionBlockerList.remove(second);
        chai.expect(transactionBlockerList.size()).to.be.equal(0);
    });

    it('Should remove items from list', () => {
        chai.expect(transactionBlockerList.size()).to.be.equal(0);

        transactionBlockerList.add(first);
        transactionBlockerList.add(second);

        chai.expect(transactionBlockerList.size()).to.be.equal(2);

        transactionBlockerList.remove(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(1);

        transactionBlockerList.remove(second);
        chai.expect(transactionBlockerList.size()).to.be.equal(0);
    });

    it('Should remove first item by given id', () => {
        chai.expect(transactionBlockerList.size()).to.be.equal(0);

        transactionBlockerList.add(first);
        transactionBlockerList.add(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(2);

        transactionBlockerList.remove(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(1);

        transactionBlockerList.remove(first);
        chai.expect(transactionBlockerList.size()).to.be.equal(0);
    });

    it('Should find item by id', () => {
        transactionBlockerList.add(first);
        transactionBlockerList.add(second);

        chai.expect(transactionBlockerList.findById(first.getId())).to.be.equal(first);
        chai.expect(transactionBlockerList.findById(second.getId())).to.be.equal(second);
    });

    it('Should find item by item', () => {
        transactionBlockerList.add(first);
        transactionBlockerList.add(second);

        chai.expect(transactionBlockerList.find(first)).to.be.equal(first);
        chai.expect(transactionBlockerList.find(second)).to.be.equal(second);
    });

    it('Should return blockers promises', () => {
        transactionBlockerList.add(first);
        transactionBlockerList.add(second);

        chai.expect(transactionBlockerList.promises()).to.have.members([first.promise(), second.promise()]);
    });
});
