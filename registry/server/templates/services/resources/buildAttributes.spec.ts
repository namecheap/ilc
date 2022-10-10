import { expect } from 'chai';
import { buildAttributes } from './buildAttributes';

describe('buildAttributes', () => {
    it('should stringify provided params', () => {
        const stringified = buildAttributes({
            one: 'for sorrow',
            two: 'for joy',
            three: 'for a girl',
            four: 'for a boy',
        });

        expect(stringified).to.equal('one="for sorrow" two="for joy" three="for a girl" four="for a boy"');
    });

    it('should escape html symbols in values', () => {
        const stringified = buildAttributes({
            one: 'for > sorrow',
            two: 'for < joy',
            three: 'for "a" girl',
            four: 'for & boy',
            five: 'for \' silver',
        });

        expect(stringified).to.equal('one="for &gt; sorrow" two="for &lt; joy" three="for &quot;a&quot; girl" four="for &amp; boy" five="for &#39; silver"');
    });


    it('should not add value if value equal to attribute name', () => {
        const stringified = buildAttributes({
            one: 'one',
            two: 'two',
            three: 'three',
            four: 'four',
        });

        expect(stringified).to.equal('one two three four');
    });
});
