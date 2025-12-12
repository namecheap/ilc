import { expect } from 'chai';
import sinon from 'sinon';
import { SystemJSImportMap } from './SystemJSImportMap';
import { getIlcConfigRoot } from './getIlcConfigRoot';

describe('SystemJSImportMap', () => {
    it('SystemJSImportMap should configure SystemJS', () => {
        const configRoot = getIlcConfigRoot();
        const instance = new SystemJSImportMap(configRoot.getConfigForApps(), configRoot.getConfigForSharedLibs());
        const sandbox = sinon.createSandbox();

        sandbox.spy(document.head, 'appendChild');
        instance.configure();
        expect(document.head.appendChild.calledOnce).to.be.true;
        sandbox.restore();
    });

    it('should process shared libraries with @sharedLibrary prefix', () => {
        const apps = {
            app1: {
                spaBundle: 'http://example.com/app1.js',
            },
        };
        const sharedLibs = {
            lodash: 'http://cdn.com/lodash.js',
            moment: 'http://cdn.com/moment.js',
        };

        const instance = new SystemJSImportMap(apps, sharedLibs);

        expect(instance.deps).to.deep.equal({
            app1: 'http://example.com/app1.js',
            '@sharedLibrary/lodash': 'http://cdn.com/lodash.js',
            '@sharedLibrary/moment': 'http://cdn.com/moment.js',
        });
    });
});
