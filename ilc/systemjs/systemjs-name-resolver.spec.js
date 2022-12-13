import chai from 'chai';

describe('systemjs name resolver', () => {
    it('should return null while trying to get module info of nonexistent module', () => {
        chai.expect(window.System.getModuleInfo('undefined')).to.be.null;
    });

    it('should get module info by module id or src', async () => {
        const expectedModuleInfo = {
            name: './base/systemjs/spec/fixtures/anonymous-define.js',
            src: 'http://localhost:9876/base/systemjs/spec/fixtures/anonymous-define.js',
            dependants: [],
        };
        const expectedImportedModule = {
            hi: 'from anonymous defined module',
        };

        const importedModule = await window.System.import(expectedModuleInfo.name);
        const moduleInfoById = window.System.getModuleInfo(expectedModuleInfo.name);
        const moduleInfoBySrc = window.System.getModuleInfo(expectedModuleInfo.src);

        chai.expect(importedModule).to.be.eql(expectedImportedModule);
        chai.expect(moduleInfoById).to.be.eql(expectedModuleInfo);
        chai.expect(moduleInfoBySrc).to.be.eql(expectedModuleInfo);
    });

    it('should get module info with dependants of a child defined module', async () => {
        const expectedMainModuleInfo = {
            name: './base/systemjs/spec/fixtures/named-define-with-dependencies.js',
            src: 'http://localhost:9876/base/systemjs/spec/fixtures/named-define-with-dependencies.js',
            dependants: [],
        };
        const expectedChildModuleInfo = {
            name: './named-define-dependency.js',
            src: 'http://localhost:9876/base/systemjs/spec/fixtures/named-define-dependency.js',
            dependants: [expectedMainModuleInfo.src],
        };
        const expectedImportedMainModule = {
            hi: 'from named defined module with dependencies',
        };

        const importedMainModule = await window.System.import(expectedMainModuleInfo.name);
        const mainModuleInfo = window.System.getModuleInfo(expectedMainModuleInfo.name);
        const childModuleInfo = window.System.getModuleInfo(expectedChildModuleInfo.name);

        chai.expect(importedMainModule).to.be.eql(expectedImportedMainModule);
        chai.expect(mainModuleInfo).to.be.eql(expectedMainModuleInfo);
        chai.expect(childModuleInfo).to.be.eql(expectedChildModuleInfo);
    });
});
