import chai from 'chai';

describe('systemjs override import map', () => {
    it('should not override a module URL by id if a module can be found by id', async () => {
        const originalModuleId = './base/systemjs/spec/fixtures/anonymous-define.js';
        const overriddenModuleUrl = 'http://localhost:9876/base/systemjs/spec/fixtures/named-define-dependency.js';

        const expectedImportedModule = {
            hi: 'from anonymous defined module',
        };

        window.System.overrideImportMap(originalModuleId, overriddenModuleUrl);
        const importedModule = await window.System.import(originalModuleId);

        chai.expect(importedModule).to.be.eql(expectedImportedModule);
    });

    it('should override a module URL by id if a module can not be found by id', async () => {
        const originalModuleId = 'nonexistent';
        const overriddenModuleUrl = 'http://localhost:9876/base/systemjs/spec/fixtures/anonymous-define.js';

        const expectedImportedModule = {
            hi: 'from anonymous defined module',
        };

        window.System.overrideImportMap(originalModuleId, overriddenModuleUrl);
        const importedModule = await window.System.import(originalModuleId);

        chai.expect(importedModule).to.be.eql(expectedImportedModule);
    });

    it('should throw an error when a module can not be found by id and its URL is not overridden', async () => {
        const originalModuleId = 'undefined';

        let expectedError;

        try {
            await window.System.import(originalModuleId);
        } catch (error) {
            expectedError = error;
        }

        chai.expect(expectedError).to.be.instanceOf(Error);
    });
});
