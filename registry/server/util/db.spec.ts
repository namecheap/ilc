import { expect } from 'chai';
import { ForeignConstraintError } from '../errorHandler/httpErrors';
import {
    extractInsertedId,
    formatDate,
    handleForeignConstraintError,
    isForeignKeyViolation,
    isUniqueConstraintError,
    PG_FOREIGN_KEY_VIOLATION_CODE,
    PG_UNIQUE_VIOLATION_CODE,
} from './db';

function pgError(code: string, constraint: string): Error {
    return Object.assign(new Error('pg error'), { code, constraint });
}

describe('db utilities', () => {
    describe('extractInsertedId', () => {
        it('should return the id from a returned row', () => {
            expect(extractInsertedId([{ id: 5 }])).to.equal(5);
        });

        it('should return a plain numeric result', () => {
            expect(extractInsertedId([7])).to.equal(7);
        });
    });

    describe('formatDate', () => {
        it('should format a date as UTC "YYYY-MM-DD HH:mm:ss" without milliseconds', () => {
            expect(formatDate(new Date('2024-01-02T03:04:05.678Z'))).to.equal('2024-01-02 03:04:05');
        });
    });

    describe('isUniqueConstraintError', () => {
        it('should match a unique violation of the given constraint', () => {
            expect(isUniqueConstraintError(pgError(PG_UNIQUE_VIOLATION_CODE, 'apps_pkey'), 'apps_pkey')).to.be.true;
        });

        it('should not match a unique violation of another constraint', () => {
            expect(isUniqueConstraintError(pgError(PG_UNIQUE_VIOLATION_CODE, 'other_unique'), 'apps_pkey')).to.be.false;
        });

        it('should not match another error code for the same constraint', () => {
            expect(isUniqueConstraintError(pgError(PG_FOREIGN_KEY_VIOLATION_CODE, 'apps_pkey'), 'apps_pkey')).to.be
                .false;
        });

        it('should not match values that are not pg errors', () => {
            expect(isUniqueConstraintError(new Error('boom'), 'apps_pkey')).to.be.false;
            expect(isUniqueConstraintError(null, 'apps_pkey')).to.be.false;
            expect(isUniqueConstraintError(undefined, 'apps_pkey')).to.be.false;
            expect(isUniqueConstraintError('23505', 'apps_pkey')).to.be.false;
        });
    });

    describe('isForeignKeyViolation', () => {
        const constraint = 'routes_domainid_foreign';

        it('should match a foreign key violation of the given constraint', () => {
            expect(isForeignKeyViolation(pgError(PG_FOREIGN_KEY_VIOLATION_CODE, constraint), constraint)).to.be.true;
        });

        it('should not match a foreign key violation of another constraint', () => {
            expect(isForeignKeyViolation(pgError(PG_FOREIGN_KEY_VIOLATION_CODE, 'other_foreign'), constraint)).to.be
                .false;
        });

        it('should not match another error code for the same constraint', () => {
            expect(isForeignKeyViolation(pgError(PG_UNIQUE_VIOLATION_CODE, constraint), constraint)).to.be.false;
        });

        it('should not match values that are not pg errors', () => {
            expect(isForeignKeyViolation(new Error('boom'), constraint)).to.be.false;
            expect(isForeignKeyViolation(null, constraint)).to.be.false;
            expect(isForeignKeyViolation(undefined, constraint)).to.be.false;
        });
    });

    describe('handleForeignConstraintError', () => {
        it('should throw ForeignConstraintError for a foreign key violation message', () => {
            const error = new Error(
                'insert into "routes" violates foreign key constraint "routes_templatename_foreign"',
            );

            expect(() => handleForeignConstraintError(error)).to.throw(
                ForeignConstraintError,
                'FOREIGN KEY constraint failed',
            );
        });

        it('should not throw for other errors', () => {
            expect(() => handleForeignConstraintError(new Error('duplicate key value'))).not.to.throw();
        });

        it('should not throw for values that are not errors', () => {
            expect(() => handleForeignConstraintError('violates foreign key constraint')).not.to.throw();
            expect(() => handleForeignConstraintError(null)).not.to.throw();
        });
    });
});
