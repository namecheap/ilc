import { getIlcConfigRoot } from './getIlcConfigRoot';

describe('IlcConfigRoot', () => {
    it('IlcConfigRoot should init', () => {
        const configRoot = getIlcConfigRoot();
        console.log(configRoot.getConfigForApps());
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
});
