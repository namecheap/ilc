import { expect } from 'chai';
import { BaseError } from './BaseError';

describe('BaseError', () => {

    describe('extend', () => {
        it('should return child class', () => {
            const Child = BaseError.extend('ChildError');
            expect(new Child()).to.be.instanceOf(Child);
            expect(new Child()).to.be.instanceOf(BaseError);
        });
  
        it('should set correct child name', () => {
            const Child = BaseError.extend('ChildError');
            expect(new Child().name).to.be.equal('ChildError');
        });

        it('should set correct error code', () => {
            const Child = BaseError.extend('ChildError');
            expect(Child.errorCode).to.be.equal('child');

            const AnotherChild = BaseError.extend('AnotherChildError');
            expect(AnotherChild.errorCode).to.be.equal('anotherChild');
        });
    });

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
            const InternalError = BaseError.extend('InternalError');
            const CriticalInternalError = InternalError.extend('CriticalInternalError');

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
