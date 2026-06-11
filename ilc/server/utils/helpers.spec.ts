import { expect } from 'chai';
import { escapeJsonForScriptTag } from './helpers';

describe('helpers', () => {
    describe('escapeJsonForScriptTag', () => {
        it('escapes the characters that could break out of a <script> block', () => {
            expect(escapeJsonForScriptTag('<>&')).to.equal('\\u003c\\u003e\\u0026');
        });

        it('neutralises a </script> sequence embedded in a value', () => {
            const escaped = escapeJsonForScriptTag(JSON.stringify({ x: '</script><script>alert(1)</script>' }));
            expect(escaped).to.not.contain('</script>');
            expect(escaped).to.not.contain('<script>');
        });

        it('escapes the U+2028 / U+2029 line terminators', () => {
            expect(escapeJsonForScriptTag('a\u2028b\u2029c')).to.equal('a\\u2028b\\u2029c');
        });

        it('keeps the JSON parseable — escaping is reversible to the original value', () => {
            const value = { msg: '</script>', sep: 'a\u2028b', amp: 'Tom & Jerry' };
            const parsed = JSON.parse(escapeJsonForScriptTag(JSON.stringify(value)));
            expect(parsed).to.deep.equal(value);
        });

        it('leaves a plain string untouched', () => {
            expect(escapeJsonForScriptTag('{"a":1}')).to.equal('{"a":1}');
        });
    });
});
