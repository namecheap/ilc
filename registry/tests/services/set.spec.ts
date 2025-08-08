import { set } from '../../server/util/set';
import { expect } from 'chai';

describe('set utility', () => {
    it('should set a value for a simple key', () => {
        const obj = {};
        set(obj, 'name', 'John');
        expect(obj).to.deep.equal({ name: 'John' });
    });

    it('should set a value for a nested key', () => {
        const obj = {};
        set(obj, 'user.name', 'John');
        expect(obj).to.deep.equal({ user: { name: 'John' } });
    });

    it('should set a value for a deeply nested key', () => {
        const obj = {};
        set(obj, 'user.profile.name', 'John');
        expect(obj).to.deep.equal({ user: { profile: { name: 'John' } } });
    });

    it('should update existing properties', () => {
        const obj = { user: { name: 'Jane' } };
        set(obj, 'user.name', 'John');
        expect(obj).to.deep.equal({ user: { name: 'John' } });
    });

    it('should preserve existing properties', () => {
        const obj = { user: { name: 'Jane', age: 25 } };
        set(obj, 'user.name', 'John');
        expect(obj).to.deep.equal({ user: { name: 'John', age: 25 } });
    });

    it('should add new properties without affecting existing ones', () => {
        const obj = { user: { name: 'Jane' } };
        set(obj, 'user.age', 30);
        expect(obj).to.deep.equal({ user: { name: 'Jane', age: 30 } });
    });

    it('should handle array values', () => {
        const obj = {};
        set(obj, 'user.hobbies', ['reading', 'coding']);
        expect(obj).to.deep.equal({ user: { hobbies: ['reading', 'coding'] } });
    });

    it('should handle object values', () => {
        const obj = {};
        set(obj, 'user.address', { city: 'New York', zip: '10001' });
        expect(obj).to.deep.equal({ user: { address: { city: 'New York', zip: '10001' } } });
    });

    it('should handle null values', () => {
        const obj = { user: { name: 'Jane' } };
        set(obj, 'user.name', null);
        expect(obj).to.deep.equal({ user: { name: null } });
    });

    it('should handle undefined values', () => {
        const obj = { user: { name: 'Jane' } };
        set(obj, 'user.name', undefined);
        expect(obj).to.deep.equal({ user: { name: undefined } });
    });

    it('should create intermediate objects for nested paths', () => {
        const obj = { user: { profile: { name: 'Jane' } } };
        set(obj, 'user.settings.theme', 'dark');
        expect(obj).to.deep.equal({
            user: {
                profile: { name: 'Jane' },
                settings: { theme: 'dark' },
            },
        });
    });

    it('should throw an error when key segment is empty', () => {
        const obj = {};
        expect(() => set(obj, 'user..name', 'John')).to.throw('Invalid key: empty key segment');
    });

    it('should throw an error when the last key segment is empty', () => {
        const obj = {};
        expect(() => set(obj, 'user.', 'John')).to.throw('Invalid key: empty key segment');
    });

    it('should throw an error when the key is empty', () => {
        const obj = {};
        expect(() => set(obj, '', 'John')).to.throw('Invalid key: empty key segment');
    });
});
