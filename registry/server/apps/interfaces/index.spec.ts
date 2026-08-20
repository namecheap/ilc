import { expect } from 'chai';
import { appSchema } from './index';

describe('apps interfaces: ssr.cache schema', () => {
    const validApp = Object.freeze({
        name: '@portal/cache-schema-test',
        spaBundle: 'http://localhost:1234/bundle.js',
        kind: 'regular',
    });

    const withSsr = (ssr: Record<string, unknown>) => ({ ...validApp, ssr });

    const validSsr = Object.freeze({
        src: 'http://127.0.0.1:1234/fragment',
        timeout: 1000,
    });

    const expectRejected = async (promise: Promise<unknown>, pattern?: RegExp, message?: string) => {
        try {
            await promise;
        } catch (error: any) {
            if (pattern) {
                expect(error.message, message).to.match(pattern);
            }
            return;
        }
        expect.fail(message ? `${message}: expected validation to fail` : 'expected validation to fail');
    };

    it('should accept ssr without cache and keep ssr shape unchanged (opt-in default)', async () => {
        const value = await appSchema.validateAsync(withSsr({ ...validSsr }));

        expect(value.ssr).to.deep.equal(validSsr);
        expect(value.ssr).to.not.have.property('cache');
    });

    it('should treat cache: null as absent', async () => {
        const value = await appSchema.validateAsync(withSsr({ ...validSsr, cache: null }));

        expect(value.ssr).to.not.have.property('cache');
    });

    it('should accept cache with enabled: true and ttlSeconds', async () => {
        const value = await appSchema.validateAsync(
            withSsr({ ...validSsr, cache: { enabled: true, ttlSeconds: 300 } }),
        );

        expect(value.ssr).to.deep.equal({ ...validSsr, cache: { enabled: true, ttlSeconds: 300 } });
    });

    it('should accept cache with enabled: false without ttlSeconds', async () => {
        const value = await appSchema.validateAsync(withSsr({ ...validSsr, cache: { enabled: false } }));

        expect((value.ssr as any).cache).to.deep.equal({ enabled: false });
    });

    it('should reject cache with enabled: true but no ttlSeconds', async () => {
        await expectRejected(appSchema.validateAsync(withSsr({ ...validSsr, cache: { enabled: true } })), /ttlSeconds/);
    });

    it('should reject cache without enabled flag', async () => {
        await expectRejected(appSchema.validateAsync(withSsr({ ...validSsr, cache: { ttlSeconds: 300 } })), /enabled/);
    });

    it('should reject ttlSeconds above 30 days (config typo guard)', async () => {
        await expectRejected(
            appSchema.validateAsync(withSsr({ ...validSsr, cache: { enabled: true, ttlSeconds: 1_000_000_000 } })),
            /ttlSeconds/,
        );
    });

    it('should accept ttlSeconds at the 30 day boundary', async () => {
        const value = await appSchema.validateAsync(
            withSsr({ ...validSsr, cache: { enabled: true, ttlSeconds: 2_592_000 } }),
        );

        expect((value.ssr as any).cache.ttlSeconds).to.equal(2_592_000);
    });

    it('should reject non-positive and non-integer ttlSeconds', async () => {
        for (const ttlSeconds of [0, -10, 1.5, 'abc']) {
            await expectRejected(
                appSchema.validateAsync(withSsr({ ...validSsr, cache: { enabled: true, ttlSeconds } })),
                undefined,
                `ttlSeconds=${ttlSeconds}`,
            );
        }
    });

    it('should reject unknown keys inside cache', async () => {
        await expectRejected(
            appSchema.validateAsync(withSsr({ ...validSsr, cache: { enabled: true, ttlSeconds: 300, unknownKey: 1 } })),
            /unknownKey/,
        );
    });

    it('should reject cache without src/timeout (ssr with cache only would break rendering)', async () => {
        await expectRejected(appSchema.validateAsync(withSsr({ cache: { enabled: true, ttlSeconds: 300 } })), /src/);
    });

    it('should reject cache with src but no timeout', async () => {
        await expectRejected(
            appSchema.validateAsync(
                withSsr({ src: 'http://127.0.0.1:1234/fragment', cache: { enabled: true, ttlSeconds: 300 } }),
            ),
        );
    });

    it('should reject cache of wrong type', async () => {
        for (const cache of ['yes', 123, [1]]) {
            await expectRejected(
                appSchema.validateAsync(withSsr({ ...validSsr, cache })),
                undefined,
                `cache=${JSON.stringify(cache)}`,
            );
        }
    });
});
