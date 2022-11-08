import { expect } from './common';

import processor from '../server/common/services/assets/assetsManifestProcessor';

describe('assetsManifestProcessor', () => {
    it('perform basic link resolution & cleanup non white listed properties', () => {
        expect(
            processor(
                'https://example.com/folder/assets-discovery.js',
                {
                    a: 'tst',
                    spaBundle: 'https://example.com/aa.js',
                    cssBundle: './tst/aa.js',
                    dependencies: {
                        a1: 'https://example.com/aa.js',
                        a2: './tst/aa.js',
                    },
                },
                ['spaBundle', 'cssBundle', 'dependencies'],
            ),
        ).to.eql({
            spaBundle: 'https://example.com/aa.js',
            cssBundle: 'https://example.com/folder/tst/aa.js',
            dependencies: JSON.stringify({
                a1: 'https://example.com/aa.js',
                a2: 'https://example.com/folder/tst/aa.js',
            }),
        });
    });

    it('handles absence of dependencies object or invalid type correctly', () => {
        expect(
            processor(
                'https://example.com/folder/assets-discovery.js',
                {
                    spaBundle: 'https://example.com/aa.js',
                    cssBundle: './tst/aa.js',
                },
                ['spaBundle', 'cssBundle', 'dependencies'],
            ),
        ).to.eql({
            spaBundle: 'https://example.com/aa.js',
            cssBundle: 'https://example.com/folder/tst/aa.js',
        });

        expect(
            processor(
                'https://example.com/folder/assets-discovery.js',
                {
                    spaBundle: 'https://example.com/aa.js',
                    cssBundle: './tst/aa.js',
                    dependencies: ['aaa'],
                },
                ['spaBundle', 'cssBundle', 'dependencies'],
            ),
        ).to.eql({
            spaBundle: 'https://example.com/aa.js',
            cssBundle: 'https://example.com/folder/tst/aa.js',
        });
    });

    it('handles absence of cssBundle correctly', () => {
        expect(
            processor(
                'https://example.com/folder/assets-discovery.js',
                {
                    spaBundle: 'https://example.com/aa.js',
                },
                ['spaBundle', 'cssBundle', 'dependencies'],
            ),
        ).to.eql({
            spaBundle: 'https://example.com/aa.js',
        });
    });

    it('handles absence of spaBundle correctly', () => {
        expect(
            processor(
                'https://example.com/folder/assets-discovery.js',
                {
                    cssBundle: 'https://example.com/aa.css',
                },
                ['spaBundle', 'cssBundle', 'dependencies'],
            ),
        ).to.eql({
            cssBundle: 'https://example.com/aa.css',
        });
    });
});
