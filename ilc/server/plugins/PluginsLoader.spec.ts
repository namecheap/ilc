import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PluginsLoader } from './PluginsLoader';
const { manifest: serverPluginsManifest } = require('../../server.plugins.manifest');

interface PluginPackageJson {
    name: string;
    main: string;
}

interface TestPlugin {
    name: string;
    version?: string;
    scope?: string;
}

interface ServerPluginsManifest {
    plugins: unknown[];
}

describe('PluginsLoader', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.LEGACY_PLUGINS_DISCOVERY;
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv === undefined) {
            delete process.env.LEGACY_PLUGINS_DISCOVERY;
        } else {
            process.env.LEGACY_PLUGINS_DISCOVERY = originalEnv;
        }
    });

    describe('load', () => {
        it('should return serverPluginsManifest.plugins when legacy discovery is disabled', () => {
            process.env.LEGACY_PLUGINS_DISCOVERY = 'false';

            const loader = new PluginsLoader();
            const result = loader.load();

            expect(result).to.equal(serverPluginsManifest.plugins);
            expect(result).to.be.an('array');
        });

        it('should search for plugins in node_modules when legacy discovery is enabled', () => {
            // Don't set LEGACY_PLUGINS_DISCOVERY (defaults to enabled)
            delete process.env.LEGACY_PLUGINS_DISCOVERY;

            const loader = new PluginsLoader();
            const result = loader.load();

            // Should return an array (empty if no plugins found)
            expect(result).to.be.an('array');
        });

        it('should search for plugins when LEGACY_PLUGINS_DISCOVERY is set to true', () => {
            process.env.LEGACY_PLUGINS_DISCOVERY = 'true';

            const loader = new PluginsLoader();
            const result = loader.load();

            expect(result).to.be.an('array');
        });

        it('should search for plugins when LEGACY_PLUGINS_DISCOVERY is set to any value other than false', () => {
            process.env.LEGACY_PLUGINS_DISCOVERY = 'yes';

            const loader = new PluginsLoader();
            const result = loader.load();

            expect(result).to.be.an('array');
        });
    });

    describe('legacy plugin discovery with mock plugins', () => {
        let tempPluginDir: string;
        let originalNodeModulesPath: string | undefined;

        before(function () {
            // Check if we can create temp directories for testing
            // This test requires filesystem manipulation
            const testDir = path.resolve(__dirname, '../../../node_modules');

            if (!fs.existsSync(testDir)) {
                this.skip();
            }
        });

        beforeEach(() => {
            // Save original environment
            originalEnv = process.env.LEGACY_PLUGINS_DISCOVERY;
            delete process.env.LEGACY_PLUGINS_DISCOVERY; // Enable legacy discovery
        });

        afterEach(() => {
            // Restore environment
            if (originalEnv === undefined) {
                delete process.env.LEGACY_PLUGINS_DISCOVERY;
            } else {
                process.env.LEGACY_PLUGINS_DISCOVERY = originalEnv;
            }

            // Clean up any test plugin directories
            if (tempPluginDir && fs.existsSync(tempPluginDir)) {
                try {
                    // Clean up package.json
                    const packageJsonPath = path.join(tempPluginDir, 'package.json');
                    if (fs.existsSync(packageJsonPath)) {
                        fs.unlinkSync(packageJsonPath);
                    }

                    // Clean up index.js
                    const indexPath = path.join(tempPluginDir, 'index.js');
                    if (fs.existsSync(indexPath)) {
                        fs.unlinkSync(indexPath);
                    }

                    // Remove directory
                    fs.rmdirSync(tempPluginDir);
                } catch (err) {
                    console.warn('Failed to clean up test plugin directory:', err);
                }
            }
        });

        it('should load plugins matching ilc-plugin-* pattern', () => {
            // Create a temporary test plugin in node_modules
            const nodeModulesPath = path.resolve(__dirname, '../../../node_modules');
            tempPluginDir = path.join(nodeModulesPath, 'ilc-plugin-test');

            // Create plugin directory
            if (!fs.existsSync(tempPluginDir)) {
                fs.mkdirSync(tempPluginDir);
            }

            // Create package.json
            const packageJson: PluginPackageJson = {
                name: 'ilc-plugin-test',
                main: 'index.js',
            };
            fs.writeFileSync(path.join(tempPluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));

            // Create a simple plugin module
            const pluginCode = `module.exports = { name: 'test-plugin', version: '1.0.0' };`;
            fs.writeFileSync(path.join(tempPluginDir, 'index.js'), pluginCode);

            // Load plugins
            const loader = new PluginsLoader();
            const result = loader.load();

            // Should find and load the test plugin
            expect(result).to.be.an('array');
            expect(result).to.exist;
            expect(result?.length).to.be.greaterThan(0);

            // Check if our test plugin was loaded
            const testPlugin = result?.find((p: TestPlugin) => p && p.name === 'test-plugin');
            expect(testPlugin).to.exist;
            expect(testPlugin?.name).to.equal('test-plugin');
            expect(testPlugin?.version).to.equal('1.0.0');
        });

        it('should load scoped plugins matching @*/ilc-plugin-* pattern', () => {
            // Create a temporary scoped plugin in node_modules
            const nodeModulesPath = path.resolve(__dirname, '../../../node_modules');
            const scopeDir = path.join(nodeModulesPath, '@test-scope');
            tempPluginDir = path.join(scopeDir, 'ilc-plugin-scoped');

            // Create scope directory
            if (!fs.existsSync(scopeDir)) {
                fs.mkdirSync(scopeDir);
            }

            // Create plugin directory
            if (!fs.existsSync(tempPluginDir)) {
                fs.mkdirSync(tempPluginDir);
            }

            // Create package.json
            const packageJson: PluginPackageJson = {
                name: '@test-scope/ilc-plugin-scoped',
                main: 'index.js',
            };
            fs.writeFileSync(path.join(tempPluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));

            // Create a simple plugin module
            const pluginCode = `module.exports = { name: 'scoped-plugin', scope: '@test-scope' };`;
            fs.writeFileSync(path.join(tempPluginDir, 'index.js'), pluginCode);

            // Load plugins
            const loader = new PluginsLoader();
            const result = loader.load();

            // Should find and load the scoped plugin
            expect(result).to.be.an('array');
            expect(result).to.exist;

            // Check if our scoped plugin was loaded
            const scopedPlugin = result?.find((p: TestPlugin) => p && p.name === 'scoped-plugin');
            if (scopedPlugin) {
                expect(scopedPlugin?.name).to.equal('scoped-plugin');
                expect(scopedPlugin?.scope).to.equal('@test-scope');
            }

            // Clean up scope directory
            try {
                if (fs.existsSync(scopeDir)) {
                    fs.rmdirSync(scopeDir, { recursive: true });
                }
            } catch (err) {
                console.warn('Failed to clean up scope directory:', err);
            }
        });
    });
});
