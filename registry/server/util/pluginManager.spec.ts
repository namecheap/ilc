import { expect } from 'chai';
import { getPluginManagerInstance, loadPlugins } from './pluginManager';

describe('pluginManager', () => {
    it('should keep the same instance when plugins are loaded again', () => {
        loadPlugins();
        const instance = getPluginManagerInstance();

        loadPlugins();

        expect(getPluginManagerInstance()).to.equal(instance);
    });
});
