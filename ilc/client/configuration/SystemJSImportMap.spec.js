import { expect } from 'chai';
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
});
