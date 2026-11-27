import { describe, expect, it } from 'vitest';

import { APP_KINDS, APP_KINDS_WITH_WRAPPER } from './constants';

describe('constants', () => {
    it('offers "wrapper" only where an app itself is edited, not for a slot of a route', () => {
        expect(APP_KINDS.map((kind) => kind.id)).toEqual(['primary', 'essential', 'regular']);
        expect(APP_KINDS_WITH_WRAPPER.map((kind) => kind.id)).toEqual(['primary', 'essential', 'regular', 'wrapper']);
    });
});
