import { describe, expect, it } from 'vitest';

import { getPrefixedSharedLibName } from './getPrefixedSharedLibName';

describe('getPrefixedSharedLibName', () => {
    it('gives the name apps import a shared library by', () => {
        expect(getPrefixedSharedLibName('forms')).toBe('@sharedLibrary/forms');
    });
});
