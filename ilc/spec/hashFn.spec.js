import chai from 'chai';
import hashFn from '../common/hashFn';

describe('hashFn', () => {
    it('should return a hash which has the type of string when someone provides a string', () => {
        const str = 'str';
        const hash = hashFn(str);

        chai.expect(hash).to.be.a('string').that.does.not.equal(str);
    });

    it('should throw the error when someone provides not a string', () => {
        try {
            hashFn(123);
        } catch (error) {
            chai.expect(error).to.be.an('error').that.own.property(
                'message',
                'The provided parameter 123 into the hash function has the type of number and should have the type of string!'
            );
        }
    });
});
