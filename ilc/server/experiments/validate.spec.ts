import { expect } from 'chai';
import { validateRuleset } from './validate';
import type { Ruleset } from './interfaces';

describe('experiments/validate', () => {
    it('returns no problems for a well-formed ruleset', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'variant-a', weight: 50 },
                    { name: 'variant-b', weight: 50 },
                ],
            },
        };
        expect(validateRuleset(ruleset)).to.deep.equal([]);
    });

    it('flags weights that do not sum to 100', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'variant-a', weight: 30 },
                    { name: 'variant-b', weight: 30 },
                ],
            },
        };
        const problems = validateRuleset(ruleset);
        expect(problems).to.have.length(1);
        expect(problems[0]).to.contain('sum to 60');
    });

    it('flags duplicate variant names', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 50 },
                    { name: 'a', weight: 50 },
                ],
            },
        };
        expect(validateRuleset(ruleset).some((p) => p.includes('duplicate variant name'))).to.equal(true);
    });

    it('flags an experiment id that is not cookie-safe', () => {
        const ruleset: Ruleset = {
            'bad id;': { status: 'active', variants: [{ name: 'variant-a', weight: 100 }] },
        };
        expect(validateRuleset(ruleset).some((p) => p.includes('cookie name'))).to.equal(true);
    });

    it('accepts realistic cookie-safe ids', () => {
        const ruleset: Ruleset = {
            'search-recs-exp-2026q1': { status: 'active', variants: [{ name: 'variant-a', weight: 100 }] },
        };
        expect(validateRuleset(ruleset)).to.deep.equal([]);
    });

    it('flags negative weights', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 130 },
                    { name: 'b', weight: -30 },
                ],
            },
        };
        expect(validateRuleset(ruleset).some((p) => p.includes('negative weight'))).to.equal(true);
    });

    it('flags an experiment with no variants', () => {
        const ruleset: Ruleset = { exp: { status: 'active', variants: [] } };
        expect(validateRuleset(ruleset).some((p) => p.includes('no variants'))).to.equal(true);
    });

    it('accepts a well-formed enrollment gate', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 50 },
                    { name: 'b', weight: 50 },
                ],
                enrollment: { paths: ['/sample-nodejs'] },
            },
        };
        expect(validateRuleset(ruleset)).to.deep.equal([]);
    });

    it('flags an empty enrollment.paths (would never enroll anyone)', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 50 },
                    { name: 'b', weight: 50 },
                ],
                enrollment: { paths: [] },
            },
        };
        expect(validateRuleset(ruleset).some((p) => p.includes('enrollment.paths'))).to.equal(true);
    });

    it('flags a null enrollment value without throwing', () => {
        const ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 50 },
                    { name: 'b', weight: 50 },
                ],
                enrollment: null,
            },
        } as unknown as Ruleset;
        expect(validateRuleset(ruleset).some((p) => p.includes('enrollment.paths'))).to.equal(true);
    });

    it('flags an enrollment path without a leading slash', () => {
        const ruleset: Ruleset = {
            exp: {
                status: 'active',
                variants: [
                    { name: 'a', weight: 50 },
                    { name: 'b', weight: 50 },
                ],
                enrollment: { paths: ['sample-nodejs'] },
            },
        };
        expect(validateRuleset(ruleset).some((p) => p.includes('starting with "/"'))).to.equal(true);
    });
});
