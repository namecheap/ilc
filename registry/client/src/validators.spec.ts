import { describe, expect, it } from 'vitest';

import { disallowedWhiteSpaces, url } from './validators';

describe('validators', () => {
    describe('url', () => {
        it('accepts an empty value, so that it can be combined with "required"', () => {
            expect(url(undefined)).toBeUndefined();
            expect(url(null)).toBeUndefined();
            expect(url('')).toBeUndefined();
        });

        it('accepts an absolute URL', () => {
            expect(url('https://cdn.example.com/app.js')).toBeUndefined();
        });

        it('rejects a value that is not an absolute URL', () => {
            expect(url('/app.js')).toBe('Should be a valid URL');
        });
    });

    describe('disallowedWhiteSpaces', () => {
        it('rejects a value with a space', () => {
            expect(disallowedWhiteSpaces('my lib')).toBe('Whitespaces are disallowed');
        });

        it('accepts a value without spaces', () => {
            expect(disallowedWhiteSpaces('my-lib')).toBeUndefined();
        });
    });
});
