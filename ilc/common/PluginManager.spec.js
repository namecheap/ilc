import chai from 'chai';
import PluginManager, {PLUGIN_TYPES} from './PluginManager';

describe('PluginManager', () => {
    let pluginManager;

    describe('when trying to get a plugin that is existed', () => {
        const reportingPlugin = {
            type: PLUGIN_TYPES.reporting,
            property: 'propertyOfReportingPlugin',
            method: () => {},
        };
        const i18nParamsDetectionPlugin = {
            type: PLUGIN_TYPES.i18nParamsDetection,
            property: 'propertyOfI18nParamsDetectionPlugin',
            method: () => {},
        };
        const transitionHooksPlugin = {
            default: {
                type: PLUGIN_TYPES.transitionHooks,
                property: 'propertyOfTransitionHooksPlugin',
                method: () => {},
            },
        };

        const plugins = {
            'node_modules/@test/ilc-plugin-reporting': reportingPlugin,
            'node_modules/@test/ilc-plugin-i18n-params-detection': i18nParamsDetectionPlugin,
            'node_modules/@test/ilc-plugin-transition-hooks': transitionHooksPlugin,
            'node_modules/@test/ilc-plugin-that-is-clone-of-reporting-plugin': {
                type: PLUGIN_TYPES.reporting,
                property: 'propertyOfCloneOfReportingPlugin',
                method: () => {},
            },
            'node_modules/@test/ilc-plugin-with-non-existent-type': {
                type: 'nonExistentType',
                property: 'propertyOfPluginWithNonExistentType',
                method: () => {},
            },
        };

        function context(pluginPath) {
            return plugins[pluginPath];
        };
        context.keys = function () {
            return Object.keys(plugins);
        };

        beforeEach(() => {
            pluginManager = new PluginManager(context);
        });

        it('should return reporting plugin', () => {
            chai.expect(pluginManager.getReportingPlugin()).to.be.equals(reportingPlugin);
        });

        it('should return i18n params detection plugin', () => {
            chai.expect(pluginManager.getI18nParamsDetectionPlugin()).to.be.equals(i18nParamsDetectionPlugin);
        });

        it('should return transition hooks plugin', () => {
            chai.expect(pluginManager.getTransitionHooksPlugin()).to.be.equals(transitionHooksPlugin.default);
        });
    });

    describe('when trying to get a plugin that is non existent', () => {
        function context() {
            return;
        };
        context.keys = function () {
            return Object.keys([]);
        };

        beforeEach(() => {
            pluginManager = new PluginManager(context);
        });

        it('should return null while getting reporting plugin', () => {
            chai.expect(pluginManager.getReportingPlugin()).to.be.null;
        });

        it('should return null while getting i18n params detection plugin', () => {
            chai.expect(pluginManager.getI18nParamsDetectionPlugin()).to.be.null;
        });

        it('should return null while getting transition hooks plugin', () => {
            chai.expect(pluginManager.getTransitionHooksPlugin()).to.be.null;
        });
    });
});
