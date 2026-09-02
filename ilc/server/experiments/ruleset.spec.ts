import { expect } from 'chai';
import sinon from 'sinon';
import type { Ruleset, RulesetProvider } from './interfaces';
import {
    createRulesetProvider,
    defaultRulesetProvider,
    experimentsEnabled,
    isExperimentsEnabledValue,
    ruleset,
} from './ruleset';
import { validateRuleset } from './validate';

const configRuleset: Ruleset = {
    'from-config': {
        status: 'active',
        variants: [
            { name: 'control', weight: 50 },
            { name: 'variant-a', weight: 50 },
        ],
    },
};

const pluginRuleset: Ruleset = {
    'from-plugin': {
        status: 'active',
        variants: [
            { name: 'control', weight: 90 },
            { name: 'variant-a', weight: 10 },
        ],
    },
};

const configLayer: RulesetProvider = { getRuleset: () => configRuleset };

describe('experiments/ruleset', () => {
    it('loads a ruleset object from configuration that passes validation', () => {
        // Asserts the loader returns a well-formed, valid ruleset — not that any
        // particular experiment is configured (the ruleset is environment-specific,
        // so coupling the test to its contents would assert config, not code).
        expect(ruleset).to.be.an('object');
        expect(validateRuleset(ruleset)).to.deep.equal([]);
    });

    describe('source resolution', () => {
        let sandbox: sinon.SinonSandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('reads the config layer when no plugin supplies a source', () => {
            const provider = createRulesetProvider(() => undefined, configLayer);

            expect(provider.getRuleset()).to.be.equals(configRuleset);
        });

        it('reads the ruleset a plugin supplies', () => {
            const provider = createRulesetProvider(() => ({ getRuleset: () => pluginRuleset }), configLayer);

            expect(provider.getRuleset()).to.be.equals(pluginRuleset);
        });

        it('asks the plugin again on every read, so a refreshed copy is picked up', () => {
            // A plugin backed by a remote source refreshes its in-memory copy out-of-band; a value
            // read once and remembered here would pin whatever it held at the first request.
            const rulesets = [pluginRuleset, configRuleset];
            const provider = createRulesetProvider(() => ({ getRuleset: () => rulesets.shift()! }), configLayer);

            expect(provider.getRuleset()).to.be.equals(pluginRuleset);
            expect(provider.getRuleset()).to.be.equals(configRuleset);
        });

        it('honours a deliberately empty ruleset instead of falling back', () => {
            // The distinction the plugin contract exists to preserve, and the one place where the
            // conservative reading would be wrong. A remote source may publish an empty ruleset in
            // order to switch every experiment off at once; reading that as "the plugin has no
            // answer" would fall back to the configuration layer and turn them all back on.
            const emptyOnPurpose = {};
            const provider = createRulesetProvider(() => ({ getRuleset: () => emptyOnPurpose }), configLayer);

            expect(provider.getRuleset()).to.be.equals(emptyOnPurpose);
            expect(provider.getRuleset()).to.not.be.equals(configRuleset);
        });

        it('reads the config layer when the plugin offers nothing', () => {
            // `undefined` is how the SDK's default plugin answers when nothing is installed, and how a
            // plugin that has not filled its copy yet — or that lost its source — reports it.
            const provider = createRulesetProvider(
                () => ({ getRuleset: () => undefined as unknown as Ruleset }),
                configLayer,
            );

            expect(provider.getRuleset()).to.be.equals(configRuleset);
        });

        it('reads the config layer when the plugin supplies something that is not a ruleset', () => {
            for (const garbage of [undefined, null, 'nope', 42, () => ({})]) {
                const provider = createRulesetProvider(
                    () => ({ getRuleset: () => garbage as unknown as Ruleset }),
                    configLayer,
                );

                expect(provider.getRuleset()).to.be.equals(configRuleset);
            }
        });

        it('reads the config layer when the plugin throws, and warns once rather than per read', () => {
            const warn = sandbox.stub(console, 'warn');
            const provider = createRulesetProvider(
                () => ({
                    getRuleset: () => {
                        throw new Error('plugin is broken');
                    },
                }),
                configLayer,
            );

            expect(provider.getRuleset()).to.be.equals(configRuleset);
            expect(provider.getRuleset()).to.be.equals(configRuleset);
            expect(warn.callCount).to.equal(1);
        });

        it('passes a well-formed ruleset carrying malformed experiments through untouched', () => {
            // Shape is guarded, content is not: the assignment layer already tolerates a broken
            // experiment and `validateRuleset` reports it, so silently swapping in another ruleset
            // here would hide the problem instead of surfacing it.
            const malformed = { 'no-variants': { status: 'active', variants: [] } } as unknown as Ruleset;
            const provider = createRulesetProvider(() => ({ getRuleset: () => malformed }), configLayer);

            expect(provider.getRuleset()).to.be.equals(malformed);
            expect(validateRuleset(provider.getRuleset())).to.not.deep.equal([]);
        });
    });

    describe('defaultRulesetProvider', () => {
        it('serves the config-layer ruleset when no ruleset plugin is installed', () => {
            // The wiring through the real plugin manager: with no `experimentsRuleset` plugin
            // installed it must hand back the very object the config layer loaded at import time.
            expect(defaultRulesetProvider.getRuleset()).to.be.equals(ruleset);
        });
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
