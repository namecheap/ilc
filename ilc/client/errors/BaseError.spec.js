import { expect } from 'chai';
import { BaseError } from './BaseError';

describe('BaseError', () => {

    describe('errorId', () => {
        it('should generate errorId', () => {
            const error = new BaseError();
            expect(error.errorId).to.be.a('string');
        });

        it('should return different errorId on every call', () => {
            const error = new BaseError();
            const errorId = error.errorId;

            expect(error.errorId).to.be.equal(errorId);
            expect(error.errorId).to.be.equal(errorId);
            expect(error.errorId).to.be.equal(errorId); 
        });

        it('should generate different errorId for diferent instances', () => {
            const one = new BaseError();
            const two = new BaseError();

            expect(one.errorId).to.be.not.equal(two.errorId);
        });

        it('should generate different errorId for diferent child error instances', () => {
            class InternalError extends BaseError {};
            class CriticalInternalError extends BaseError {};

            const internalOne = new InternalError();
            const internalTwo = new InternalError();
            
            const criticalOne = new CriticalInternalError();
            const criticalTwo = new CriticalInternalError();

            let errorIds = [...new Set([internalOne, internalTwo, criticalOne, criticalTwo])];

            expect(errorIds).to.have.lengthOf(4);
        });
    });

    describe('code', () => {
        it('should return code for base error', () => {
            const error = new BaseError();
            expect(error.code).to.be.equal('base');
        });

        it('should avoid base in code for children', () => {
            class InternalError extends BaseError {};
            class CriticalInternalError extends InternalError {};

            const error = new CriticalInternalError();
            expect(error.code).to.be.equal('internal.criticalInternal');
        });
    });

    describe('stack', () => {
        it('should return stack', () => {
            const error = new BaseError();
            expect(error.stack).to.be.have.string('BaseError\n    at Context.<anonymous>');
        });

        it('should return correct stack when cause is set', () => {
            const causeError = new Error();

            const error = new BaseError({
                cause: causeError,
            });

            expect(error.stack).to.be.have.string('BaseError\n    at Context.<anonymous>');
            expect(error.stack).to.be.have.string(`\nCaused by: ${causeError.stack || causeError.toString()}`);
        });
    });
});
