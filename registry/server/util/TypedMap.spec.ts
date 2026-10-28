import { expect } from 'chai';
import { TypedMap } from './TypedMap';

type Example = {
    name: string;
    count: number;
};

describe('TypedMap', () => {
    it('should return the value stored for a key', () => {
        const map = new TypedMap<Example>();

        map.set('name', 'app');
        map.set('count', 2);

        expect(map.get('name')).to.equal('app');
        expect(map.get('count')).to.equal(2);
    });

    // The checks below run at compile time: `tsc` fails when a `@ts-expect-error` line compiles
    it('should only accept the keys and value types of its type', () => {
        const map = new TypedMap<Example>();
        map.set('count', 1);

        const count: number = map.get('count');
        // @ts-expect-error the value of `count` is not a string
        const wrongType: string = map.get('count');
        // @ts-expect-error `unknown` is not a key of the type
        map.get('unknown');
        // @ts-expect-error `unknown` is not a key of the type
        map.set('unknown', 'value');
        // @ts-expect-error the value of `count` must be a number
        map.set('count', 'two');

        // At runtime it is a plain Map, so both reads return the stored number
        expect(count).to.equal(1);
        expect(wrongType).to.equal(1);
    });
});
