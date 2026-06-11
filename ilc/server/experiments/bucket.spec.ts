import { expect } from 'chai';
import { bucketVariant, hashSeed } from './bucket';
import type { ExperimentVariant } from './interfaces';

const fiftyFifty: ExperimentVariant[] = [
    { name: 'variant-a', weight: 50 },
    { name: 'variant-b', weight: 50 },
];

describe('experiments/bucket', () => {
    describe('hashSeed', () => {
        it('is deterministic for the same input', () => {
            expect(hashSeed('abc:test')).to.equal(hashSeed('abc:test'));
        });

        it('matches frozen golden values (guards cross-pod / cross-Node stickiness)', () => {
            // Pinning the exact output protects the documented stability guarantee: any
            // change to the hash (algorithm, byte offset) would silently re-bucket every
            // cookie-less visitor. Values are the first 4 bytes of SHA-256, big-endian.
            expect(hashSeed('golden-session:golden-exp')).to.equal(265145338);
            expect(hashSeed('abc:test')).to.equal(2803300838);
        });

        it('returns an unsigned 32-bit integer', () => {
            const hash = hashSeed('some-session:some-experiment');
            expect(hash).to.be.a('number');
            expect(hash).to.be.within(0, 0xffffffff);
            expect(Number.isInteger(hash)).to.equal(true);
        });

        it('produces different hashes for different inputs', () => {
            expect(hashSeed('a:x')).to.not.equal(hashSeed('b:x'));
        });
    });

    describe('bucketVariant', () => {
        it('always returns the same variant for the same session and experiment', () => {
            const first = bucketVariant('session-1', 'exp', fiftyFifty);
            const second = bucketVariant('session-1', 'exp', fiftyFifty);
            expect(first).to.equal(second);
        });

        it('returns undefined when there are no variants', () => {
            expect(bucketVariant('session-1', 'exp', [])).to.equal(undefined);
        });

        it('only ever returns a declared variant name', () => {
            for (let i = 0; i < 1000; i++) {
                const variant = bucketVariant(`session-${i}`, 'exp', fiftyFifty);
                expect(['variant-a', 'variant-b']).to.include(variant);
            }
        });

        it('distributes a 50/50 split within a small tolerance', () => {
            const counts: Record<string, number> = {};
            const total = 10000;
            for (let i = 0; i < total; i++) {
                const variant = bucketVariant(`visitor-${i}`, 'homepage-hero', fiftyFifty) as string;
                counts[variant] = (counts[variant] ?? 0) + 1;
            }
            const skew = Math.abs((counts['variant-a'] ?? 0) - (counts['variant-b'] ?? 0)) / total;
            expect(skew).to.be.lessThan(0.05);
        });

        it('keeps lower buckets in the baseline when a variant weight grows (contiguous slices)', () => {
            // A session that lands in the baseline at 50/50 must remain baseline when
            // the variant-b weight grows from the top of the range.
            const baselineHeavy: ExperimentVariant[] = [
                { name: 'variant-a', weight: 70 },
                { name: 'variant-b', weight: 30 },
            ];
            for (let i = 0; i < 2000; i++) {
                const session = `visitor-${i}`;
                if (bucketVariant(session, 'exp', fiftyFifty) === 'variant-a') {
                    // baseline slice [0,50) is a subset of [0,70) => still baseline.
                    expect(bucketVariant(session, 'exp', baselineHeavy)).to.equal('variant-a');
                }
            }
        });

        it('respects a 100% single-variant allocation', () => {
            const allVariantB: ExperimentVariant[] = [{ name: 'variant-b', weight: 100 }];
            for (let i = 0; i < 200; i++) {
                expect(bucketVariant(`v-${i}`, 'exp', allVariantB)).to.equal('variant-b');
            }
        });

        it('maps the frozen golden session to its expected variant', () => {
            // hashSeed('golden-session:golden-exp') % 100 === 38, which falls in the baseline's [0,50).
            expect(bucketVariant('golden-session', 'golden-exp', fiftyFifty)).to.equal('variant-a');
        });

        it('only returns declared names for an N-variant (3-way) experiment', () => {
            const threeWay: ExperimentVariant[] = [
                { name: 'variant-a', weight: 34 },
                { name: 'variant-b', weight: 33 },
                { name: 'variant-c', weight: 33 },
            ];
            const seen = new Set<string>();
            for (let i = 0; i < 3000; i++) {
                const v = bucketVariant(`n-${i}`, 'cta', threeWay);
                expect(['variant-a', 'variant-b', 'variant-c']).to.include(v);
                seen.add(v as string);
            }
            // all three slices are reachable
            expect(seen.size).to.equal(3);
        });

        it('falls back to the first variant (never undefined) when weights sum to < 100', () => {
            // variant-a + variant-b = 80; buckets [80,100) have no owner and must fall back to variant-a.
            const under: ExperimentVariant[] = [
                { name: 'variant-a', weight: 40 },
                { name: 'variant-b', weight: 40 },
            ];
            for (let i = 0; i < 1000; i++) {
                const v = bucketVariant(`u-${i}`, 'exp', under);
                expect(v).to.not.equal(undefined);
                expect(['variant-a', 'variant-b']).to.include(v);
            }
        });
    });
});
