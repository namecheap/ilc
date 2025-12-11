const chai = require('chai');
const { isStaticFile, isHealthCheck, isDataUri } = require('./utils');

describe('Utils', () => {
    describe('isStaticFile', () => {
        it('should return true for .js files', () => {
            chai.expect(isStaticFile('/path/to/file.js')).to.be.true;
            chai.expect(isStaticFile('file.js')).to.be.true;
        });

        it('should return true for .js.map files', () => {
            chai.expect(isStaticFile('/path/to/file.js.map')).to.be.true;
            chai.expect(isStaticFile('file.js.map')).to.be.true;
        });

        it('should return false for other files', () => {
            chai.expect(isStaticFile('/path/to/file.css')).to.be.false;
            chai.expect(isStaticFile('/path/to/page.html')).to.be.false;
            chai.expect(isStaticFile('/api/endpoint')).to.be.false;
        });
    });

    describe('isDataUri', () => {
        it('should return true for data URIs with leading slash', () => {
            chai.expect(isDataUri('/data:image/svg+xml;base64,PD94bWw=')).to.be.true;
            chai.expect(isDataUri('/data:image/png;base64,iVBORw0KGgo=')).to.be.true;
            chai.expect(isDataUri('/data:text/html,<h1>Test</h1>')).to.be.true;
        });

        it('should return true for data URIs without leading slash', () => {
            chai.expect(isDataUri('data:image/svg+xml;base64,PD94bWw=')).to.be.true;
            chai.expect(isDataUri('data:image/png;base64,iVBORw0KGgo=')).to.be.true;
            chai.expect(isDataUri('data:text/html,<h1>Test</h1>')).to.be.true;
            chai.expect(isDataUri('data:application/json,{"test":true}')).to.be.true;
        });

        it('should return false for regular paths', () => {
            chai.expect(isDataUri('/path/to/page')).to.be.false;
            chai.expect(isDataUri('/api/data')).to.be.false;
            chai.expect(isDataUri('/dashboard')).to.be.false;
            chai.expect(isDataUri('/')).to.be.false;
        });

        it('should return false for paths that contain "data" but are not data URIs', () => {
            chai.expect(isDataUri('/api/data/users')).to.be.false;
            chai.expect(isDataUri('/metadata')).to.be.false;
            chai.expect(isDataUri('/data-export')).to.be.false;
        });

        it('should handle edge cases', () => {
            chai.expect(isDataUri('')).to.be.false;
            chai.expect(isDataUri('data')).to.be.false;
            chai.expect(isDataUri('/data')).to.be.false;
            chai.expect(isDataUri(null)).to.be.false;
            chai.expect(isDataUri(undefined)).to.be.false;
        });

        describe('bypass attempts (security)', () => {
            it('should detect case-insensitive data URI variants', () => {
                chai.expect(isDataUri('DATA:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('/DATA:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('Data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('dAtA:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('/DaTa:text/html,test')).to.be.true;
            });

            it('should detect URL-encoded data URI variants', () => {
                // URL-encoded colon: %3A
                chai.expect(isDataUri('/data%3Aimage/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('data%3Aimage/png;base64,xxx')).to.be.true;

                // URL-encoded 'd': %64
                chai.expect(isDataUri('/%64ata:image/png;base64,xxx')).to.be.true;

                // Mixed encoding
                chai.expect(isDataUri('%64ata%3Aimage/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('/%44ATA%3aimage/png')).to.be.true;
            });

            it('should detect multiple leading slash variants', () => {
                chai.expect(isDataUri('//data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('///data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('////data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('///////data:text/html,test')).to.be.true;
            });

            it('should detect data URIs with leading whitespace', () => {
                chai.expect(isDataUri(' data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('  /data:image/png;base64,xxx')).to.be.true;
                chai.expect(isDataUri('\tdata:text/html,test')).to.be.true;
                chai.expect(isDataUri('\n/data:text/html,test')).to.be.true;
            });

            it('should detect combined bypass attempts', () => {
                chai.expect(isDataUri('//DATA:image/png;base64,xxx')).to.be.true;

                chai.expect(isDataUri('//data%3Aimage/png;base64,xxx')).to.be.true;

                chai.expect(isDataUri('  //DaTa:image/png;base64,xxx')).to.be.true;

                chai.expect(isDataUri(' ///%64ATA%3aimage/png')).to.be.true;
            });
        });
    });
});
