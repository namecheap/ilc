import chai from 'chai';
import localStorage from './localStorage';

describe('localStorage', () => {
    afterEach(() => {
        localStorage.clear();
    });

    it('should return null if empty', async () => {
        chai.expect(localStorage.getItem('key')).to.equal(null);
    });

    it('should return key name', async () => {
        localStorage.setItem('a', 1);

        chai.expect(localStorage.key(0)).to.equal('a');
    });

    it('should return item', async () => {
        localStorage.setItem('b', '2');

        chai.expect(localStorage.getItem('b')).to.equal('2');
    });

    it('should return string if passed number', async () => {
        localStorage.setItem('a', 1);

        chai.expect(localStorage.getItem('a')).to.equal('1');
    });

    it('should return items length', async () => {
        localStorage.setItem('a', 1);
        localStorage.setItem('b', '2');

        chai.expect(localStorage.length).to.equal(2);
    });

    it('should remove item', async () => {
        localStorage.setItem('b', '2');
        chai.expect(localStorage.getItem('b')).to.equal('2');

        localStorage.removeItem('b');
        chai.expect(localStorage.getItem('b')).to.equal(null);
        chai.expect(localStorage.length).to.equal(0);
    });

    it('should clear storage', async () => {
        localStorage.setItem('a', 1);
        localStorage.setItem('b', '2');
        chai.expect(localStorage.getItem('a')).to.equal('1');
        chai.expect(localStorage.getItem('b')).to.equal('2');

        localStorage.clear();

        chai.expect(localStorage.getItem('a')).to.equal(null);
        chai.expect(localStorage.getItem('b')).to.equal(null);
        chai.expect(localStorage.length).to.equal(0);
    });
});
