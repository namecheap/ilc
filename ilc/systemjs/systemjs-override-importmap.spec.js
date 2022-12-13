import { expect } from 'chai';

const imports = {
    'anonymous-define': 'http://localhost:9876/base/systemjs/spec/fixtures/anonymous-define.js',
    'named-define-dependency': 'http://localhost:9876/base/systemjs/spec/fixtures/named-define-dependency.js',
    'named-define-with-dependencies':
        'http://localhost:9876/base/systemjs/spec/fixtures/named-define-with-dependencies.js',
};

describe('systemjs override import map', () => {
    beforeEach(() => {
        const script = document.createElement('script');
        script.type = 'systemjs-importmap';
        script.text = JSON.stringify({ imports });
        document.head.append(script);

        window.System.prepareImport(true);
    });

    afterEach(() => {
        for (let [id, module] of window.System.entries()) {
            window.System.delete(id);
        }
    });

    it('should resolve named module', async () => {
        expect(await window.System.import('anonymous-define')).to.be.eql({ hi: 'from anonymous defined module' });
    });

    it('should override named module before first resolve', async () => {
        const moduleId = 'anonymous-define';

        window.System.overrideImportMap(moduleId, imports['named-define-dependency']);

        expect(await window.System.import(moduleId)).to.be.eql({ hi: 'from named defined dependency module' });
    });

    it('should override named module after first resolve', async () => {
        const moduleId = 'anonymous-define';

        expect(await window.System.import(moduleId)).to.be.eql({ hi: 'from anonymous defined module' });

        window.System.overrideImportMap(moduleId, imports['named-define-dependency']);

        expect(await window.System.import(moduleId)).to.be.eql({ hi: 'from named defined dependency module' });
    });
});
