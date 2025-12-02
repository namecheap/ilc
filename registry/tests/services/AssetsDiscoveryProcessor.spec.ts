import { expect } from 'chai';
import nock from 'nock';
import { AssetsDiscoveryProcessor } from '../../server/common/services/assets/AssetsDiscoveryProcessor';

describe('AssetsDiscoveryProcessor', () => {
    const baseUrl = 'http://example.com';
    const manifestPath = '/manifest.json';
    const assetsDiscoveryUrl = `${baseUrl}${manifestPath}`;
    let nockScope: nock.Scope;
    let nockInterceptor: nock.Interceptor;

    before(() => {
        nockScope = nock(baseUrl).persist();
        nockInterceptor = nockScope.get(manifestPath);
    });

    after(() => {
        nock.cleanAll();
    });

    describe('process', () => {
        it('should process manifest with only spaBundle', async () => {
            const manifest = {
                spaBundle: 'app.js',
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
            });
        });

        it('should process manifest with spaBundle and cssBundle', async () => {
            const manifest = {
                spaBundle: 'app.js',
                cssBundle: 'app.css',
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
                cssBundle: `${baseUrl}/app.css`,
            });
        });

        it('should process manifest with dependencies', async () => {
            const manifest = {
                spaBundle: 'app.js',
                dependencies: {
                    react: 'react.js',
                    'react-dom': 'react-dom.js',
                },
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
                dependencies: {
                    react: `${baseUrl}/react.js`,
                    'react-dom': `${baseUrl}/react-dom.js`,
                },
            });
        });

        it('should process manifest with cssBundle and dependencies', async () => {
            const manifest = {
                spaBundle: 'app.js',
                cssBundle: 'app.css',
                dependencies: {
                    lodash: 'lodash.js',
                    axios: 'axios.js',
                    moment: 'moment.js',
                },
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
                cssBundle: `${baseUrl}/app.css`,
                dependencies: {
                    lodash: `${baseUrl}/lodash.js`,
                    axios: `${baseUrl}/axios.js`,
                    moment: `${baseUrl}/moment.js`,
                },
            });
        });

        it('should handle absolute URLs in manifest', async () => {
            const manifest = {
                spaBundle: 'https://cdn.example.com/app.js',
                cssBundle: 'https://cdn.example.com/app.css',
                dependencies: {
                    react: 'https://unpkg.com/react@17/umd/react.production.min.js',
                },
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            // Absolute URLs should remain absolute
            expect(result).to.deep.equal({
                spaBundle: 'https://cdn.example.com/app.js',
                cssBundle: 'https://cdn.example.com/app.css',
                dependencies: {
                    react: 'https://unpkg.com/react@17/umd/react.production.min.js',
                },
            });
        });

        it('should handle mixed relative and absolute URLs', async () => {
            const manifest = {
                spaBundle: 'app.js',
                cssBundle: 'https://cdn.example.com/app.css',
                dependencies: {
                    'local-lib': 'lib.js',
                    'external-lib': 'https://cdn.com/external.js',
                },
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
                cssBundle: 'https://cdn.example.com/app.css',
                dependencies: {
                    'local-lib': `${baseUrl}/lib.js`,
                    'external-lib': 'https://cdn.com/external.js',
                },
            });
        });

        it('should handle empty dependencies object', async () => {
            const manifest = {
                spaBundle: 'app.js',
                dependencies: {},
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/app.js`,
                dependencies: {},
            });
        });

        it('should handle relative paths with subdirectories', async () => {
            const manifest = {
                spaBundle: 'dist/app.js',
                cssBundle: 'dist/styles/app.css',
                dependencies: {
                    utils: 'libs/utils.js',
                },
            };

            nockInterceptor.reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: `${baseUrl}/dist/app.js`,
                cssBundle: `${baseUrl}/dist/styles/app.css`,
                dependencies: {
                    utils: `${baseUrl}/libs/utils.js`,
                },
            });
        });

        it('should resolve URLs relative to discovery URL with path', async () => {
            const baseUrlWithPath = 'http://example.com/apps/myapp';
            const manifestPathLocal = '/assets-discovery.json';
            const discoveryUrl = `${baseUrlWithPath}${manifestPathLocal}`;

            const manifest = {
                spaBundle: 'bundle.js',
                cssBundle: 'styles.css',
            };

            nockScope.get('/apps/myapp/assets-discovery.json').reply(200, manifest);

            const result = await AssetsDiscoveryProcessor.process(discoveryUrl);

            expect(result).to.deep.equal({
                spaBundle: 'http://example.com/apps/myapp/bundle.js',
                cssBundle: 'http://example.com/apps/myapp/styles.css',
            });
        });
    });
});
