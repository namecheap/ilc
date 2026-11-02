import { expect } from 'chai';
import { parseSessionMaxAgeSeconds } from './sessionConfig';

describe('sessionConfig', () => {
    describe('parseSessionMaxAgeSeconds', () => {
        it('should accept a positive number', () => {
            expect(parseSessionMaxAgeSeconds(28800)).to.equal(28800);
            expect(parseSessionMaxAgeSeconds(0.5)).to.equal(0.5);
        });

        it('should coerce a numeric string from the environment', () => {
            expect(parseSessionMaxAgeSeconds('3600')).to.equal(3600);
            expect(parseSessionMaxAgeSeconds(' 3600 ')).to.equal(3600);
        });

        it('should throw for values that are not positive finite numbers', () => {
            for (const value of [0, -1, NaN, Infinity, '', '  ', 'abc', '1h', null, undefined, true, {}, []]) {
                expect(() => parseSessionMaxAgeSeconds(value), JSON.stringify(value)).to.throw(
                    'AUTH_SESSION_MAX_AGE_SECONDS',
                );
            }
        });
    });
});
