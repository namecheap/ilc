import { expect } from 'chai';
import { experimentsEnabled, isExperimentsEnabledValue, ruleset } from './ruleset';
import { validateRuleset } from './validate';

describe('experiments/ruleset', () => {
    it('loads a ruleset object from configuration that passes validation', () => {
        // Asserts the loader returns a well-formed, valid ruleset — not that any
        // particular experiment is configured (the ruleset is environment-specific,
        // so coupling the test to its contents would assert config, not code).
        expect(ruleset).to.be.an('object');
        expect(validateRuleset(ruleset)).to.deep.equal([]);
    });

    describe('kill-switch', () => {
        it('is enabled by default (config value true / absent)', () => {
            expect(experimentsEnabled()).to.equal(true);
        });

        it('treats only boolean false and string "false" as disabled', () => {
            expect(isExperimentsEnabledValue(false)).to.equal(false);
            expect(isExperimentsEnabledValue('false')).to.equal(false); // env vars arrive as strings
            expect(isExperimentsEnabledValue(true)).to.equal(true);
            expect(isExperimentsEnabledValue(undefined)).to.equal(true);
            expect(isExperimentsEnabledValue('true')).to.equal(true);
        });
    });
});
