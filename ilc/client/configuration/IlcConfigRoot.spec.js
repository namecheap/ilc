import { expect } from 'chai';
import { getIlcConfigRoot } from './getIlcConfigRoot';
import { IlcConfigRoot } from './IlcConfigRoot';

describe('IlcConfigRoot', () => {
    it('IlcConfigRoot should init', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot).to.be.an('object');
    });
    it('IlcConfigRoot should return singleton', () => {
        const configRoot = getIlcConfigRoot();
        const configRoot2 = getIlcConfigRoot();
        expect(configRoot).equal(configRoot2);
    });
    it('IlcConfigRoot should return config', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getConfig()).to.have.keys(['apps', 'routes', 'specialRoutes', 'settings', 'sharedLibs']);
    });
    it('IlcConfigRoot should return Config For Apps', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getConfigForApps()).to.have.keys([
            '@portal/fetchWithCache',
            '@portal/navbar',
            '@portal/news',
            '@portal/people',
            '@portal/planets',
            '@portal/system',
            '@portal/systemWithWrapper',
            '@portal/wrapper',
            '@portal/clientless',
        ]);
    });

    it('IlcConfigRoot should return Config For an App', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getConfigForAppByName('@portal/navbar')).to.have.keys([
            'dependencies',
            'spaBundle',
            'kind',
            'l10nManifest',
        ]);
    });

    it('IlcConfigRoot should return Config For Shared Lib', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getConfigForSharedLibs()).eql({});
    });

    it('IlcConfigRoot should return Config For Settings', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getSettings()).to.have.keys([
            'amdDefineCompatibilityMode',
            'globalSpinner',
            'i18n',
            'onPropsUpdate',
            'trailingSlash',
        ]);
    });

    it('IlcConfigRoot should return Config For Settings By Key', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.getSettingsByKey('i18n')).to.be.an('object');
    });

    it('IlcConfigRoot should return if app is clientless', () => {
        const configRoot = getIlcConfigRoot();
        expect(configRoot.isApplicationClientlessByAppName('@portal/navbar')).to.be.false;
        expect(configRoot.isApplicationClientlessByAppName('@portal/clientless')).to.be.true;
    });

    describe('with custom config', () => {
        let originalConfigNode;

        beforeEach(() => {
            originalConfigNode = document.querySelector('script[type="text/ilc-config"]');
        });

        afterEach(() => {
            const currentNode = document.querySelector('script[type="text/ilc-config"]');
            if (currentNode && currentNode !== originalConfigNode) {
                currentNode.remove();
            }
            if (originalConfigNode && !document.contains(originalConfigNode)) {
                document.head.appendChild(originalConfigNode);
            }
        });

        it('should decode HTML entities in globalSpinner customHTML', () => {
            const config = {
                apps: {},
                routes: [],
                specialRoutes: {},
                settings: {
                    globalSpinner: {
                        enabled: true,
                        customHTML: '&lt;div&gt;Loading...&lt;/div&gt;',
                    },
                },
                sharedLibs: {},
            };

            const existingNode = document.querySelector('script[type="text/ilc-config"]');
            if (existingNode) {
                existingNode.remove();
            }

            const scriptEl = document.createElement('script');
            scriptEl.setAttribute('type', 'text/ilc-config');
            scriptEl.innerHTML = JSON.stringify(config);
            document.head.appendChild(scriptEl);

            const configRoot = new IlcConfigRoot();

            const settings = configRoot.getSettings();
            expect(settings.globalSpinner.customHTML).to.equal('<div>Loading...</div>');
        });

        it('should return config for shared libs by name from dynamicLibs', () => {
            const config = {
                apps: {},
                routes: [],
                specialRoutes: {},
                settings: {},
                sharedLibs: {},
                dynamicLibs: {
                    testLib: {
                        spaBundle: 'http://example.com/test.js',
                    },
                },
            };

            const existingNode = document.querySelector('script[type="text/ilc-config"]');
            if (existingNode) {
                existingNode.remove();
            }

            const scriptEl = document.createElement('script');
            scriptEl.setAttribute('type', 'text/ilc-config');
            scriptEl.innerHTML = JSON.stringify(config);
            document.head.appendChild(scriptEl);

            const configRoot = new IlcConfigRoot();

            const testLib = configRoot.getConfigForSharedLibsByName('testLib');
            expect(testLib).to.deep.equal({ spaBundle: 'http://example.com/test.js' });
        });
    });
});
