import { expect } from 'chai';
import { filterObject } from './filterObject';

describe('filterObject', () => {
    it('should allow only mentioned in filter properties', () => {
        const filtered = filterObject(
            {
                one: 'for sorrow',
                two: 'for joy',
                three: 'for a girl',
                four: 'for a boy',
            },
            {
                two: null,
                four: null,
            },
        );

        expect(Object.keys(filtered)).to.deep.equal(['two', 'four']);
    });

    it('should allow any propertу value if specific values are not provided', () => {
        let filtered = filterObject(
            {
                one: 'for sorrow',
                two: 'for joy',
                three: 'for a girl',
                four: 'for a boy',
            },
            {
                two: null,
                four: null,
            },
        );

        expect(filtered).to.deep.equal({
            two: 'for joy',
            four: 'for a boy',
        });
    });

    it('should allow any propertу value if specific values are empty array', () => {
        let filtered = filterObject(
            {
                one: 'for sorrow',
                two: 'for joy',
                three: 'for a girl',
                four: 'for a boy',
            },
            {
                two: [],
                four: [],
            },
        );

        expect(filtered).to.deep.equal({
            two: 'for joy',
            four: 'for a boy',
        });
    });

    it('should allow only specific values if provided', () => {
        const filtered = filterObject(
            {
                one: 'for sorrow',
                two: 'for joy',
                three: 'for a girl',
                four: 'for a boy',
            },
            {
                two: ['some other', 'for joy'],
                four: ['filter me out'],
            },
        );

        expect(filtered).to.deep.equal({
            two: 'for joy',
        });
    });
});
