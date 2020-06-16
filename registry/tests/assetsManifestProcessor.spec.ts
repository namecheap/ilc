import { expect } from './common';

import processor from '../server/common/services/assetsManifestProcessor'

describe('assetsManifestProcessor', () => {
    it('perform basic link resolution & cleanup of extra props',  () => {
        expect(processor('https://example.com/folder/assets-discovery.js', {
            a: 'tst',
            spaBundle: 'https://example.com/aa.js',
            cssBundle: './tst/aa.js',
            dependencies: {
                a1: 'https://example.com/aa.js',
                a2: './tst/aa.js',
            }
        })).to.eql({
            spaBundle: 'https://example.com/aa.js',
            cssBundle: 'https://example.com/folder/tst/aa.js',
            dependencies: JSON.stringify({
                a1: 'https://example.com/aa.js',
                a2: 'https://example.com/folder/tst/aa.js',
            })
        });
    });
});
