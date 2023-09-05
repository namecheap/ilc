import { PluginManager } from 'ilc-plugins-sdk';
import { manifest } from '../../server.plugins.manifest';

let pluginManagerInstance: PluginManager;

export function loadPlugins() {
    if (!pluginManagerInstance) {
        pluginManagerInstance = new PluginManager(...manifest.plugins);
    }
}

export function getPluginManagerInstance() {
    if (!pluginManagerInstance) {
        throw new Error('Plugin manager not initialized');
    }
    return pluginManagerInstance;
}
