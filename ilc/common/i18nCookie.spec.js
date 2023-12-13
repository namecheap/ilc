import { expect } from 'chai';
import { decode, encode } from './i18nCookie';

describe('i18nCookie', () => {
    describe('Encode', () => {
        it('should encode language and currency', () => {
            const encoded = encode({ currency: 'USD', locale: 'en' });

            expect(encoded).eq('en:USD');
        });

        it('should throw on null', () => {
            expect(() => encode(null)).to.throw(Error);
        });

        it('should throw on undefined', () => {
            expect(() => encode(undefined)).to.throw(Error);
        });

        it('should throw without locale', () => {
            expect(() => encode({ currency: 'USD' })).to.throw(Error);
        });

        it('should throw without currency', () => {
            expect(() => encode({ locale: 'en' })).to.throw(Error);
        });
    });

    describe('Decode', () => {
        it('should decode language and currency', () => {
            const decoded = decode('en:USD');

            expect(decoded).deep.eq({ currency: 'USD', locale: 'en' });
        });

        it('should return empty object', () => {
            const decoded = decode(undefined);

            expect(decoded).deep.eq({});
        });
    });
});
