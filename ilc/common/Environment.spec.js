import { expect } from 'chai';
import { Environment } from './Environment';

describe('Environment', () => {
    let environment;

    describe('Legacy plugins discovery', () => {
        it('return true if no environment variable', () => {
            environment = new Environment({});

            expect(environment.isLegacyPluginsDiscoveryEnabled()).to.be.true;
        });

        it('return false if no environment variable is set to false', () => {
            environment = new Environment({
                LEGACY_PLUGINS_DISCOVERY: 'false',
            });

            expect(environment.isLegacyPluginsDiscoveryEnabled()).to.be.false;
        });

        it('return true if no environment variable is set to true', () => {
            environment = new Environment({
                LEGACY_PLUGINS_DISCOVERY: 'true',
            });

            expect(environment.isLegacyPluginsDiscoveryEnabled()).to.be.true;
        });
    });
});
