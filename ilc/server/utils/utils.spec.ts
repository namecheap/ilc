import { expect } from 'chai';
import { isStaticFile, isHealthCheck, isDataUri } from './utils';

describe('Utils', () => {
    describe('isStaticFile', () => {
        it('should return true for .js files', () => {
            expect(isStaticFile('/path/to/file.js')).to.be.true;
            expect(isStaticFile('file.js')).to.be.true;
        });

        it('should return true for .js.map files', () => {
            expect(isStaticFile('/path/to/file.js.map')).to.be.true;
            expect(isStaticFile('file.js.map')).to.be.true;
        });

        it('should return false for other files', () => {
            expect(isStaticFile('/path/to/file.css')).to.be.false;
            expect(isStaticFile('/path/to/page.html')).to.be.false;
            expect(isStaticFile('/api/endpoint')).to.be.false;
        });
    });

    describe('isDataUri', () => {
        it('should return true for data URIs with leading slash', () => {
            expect(isDataUri('/data:image/svg+xml;base64,PD94bWw=')).to.be.true;
            expect(isDataUri('/data:image/png;base64,iVBORw0KGgo=')).to.be.true;
            expect(isDataUri('/data:text/html,<h1>Test</h1>')).to.be.true;
        });

        it('should return true for data URIs without leading slash', () => {
            expect(isDataUri('data:image/svg+xml;base64,PD94bWw=')).to.be.true;
            expect(isDataUri('data:image/png;base64,iVBORw0KGgo=')).to.be.true;
            expect(isDataUri('data:text/html,<h1>Test</h1>')).to.be.true;
            expect(isDataUri('data:application/json,{"test":true}')).to.be.true;
        });

        it('should return false for regular paths', () => {
            expect(isDataUri('/path/to/page')).to.be.false;
            expect(isDataUri('/api/data')).to.be.false;
            expect(isDataUri('/dashboard')).to.be.false;
            expect(isDataUri('/')).to.be.false;
        });

        it('should return false for paths that contain "data" but are not data URIs', () => {
            expect(isDataUri('/api/data/users')).to.be.false;
            expect(isDataUri('/metadata')).to.be.false;
            expect(isDataUri('/data-export')).to.be.false;
        });

        it('should handle edge cases', () => {
            expect(isDataUri('')).to.be.false;
            expect(isDataUri('data')).to.be.false;
            expect(isDataUri('/data')).to.be.false;
            expect(isDataUri(null as any)).to.be.false;
            expect(isDataUri(undefined as any)).to.be.false;
        });

        describe('bypass attempts (security)', () => {
            it('should detect case-insensitive data URI variants', () => {
                expect(isDataUri('DATA:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('/DATA:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('Data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('dAtA:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('/DaTa:text/html,test')).to.be.true;
            });

            it('should detect URL-encoded data URI variants', () => {
                expect(isDataUri('/data%3Aimage/png;base64,xxx')).to.be.true;
                expect(isDataUri('data%3Aimage/png;base64,xxx')).to.be.true;

                expect(isDataUri('/%64ata:image/png;base64,xxx')).to.be.true;

                expect(isDataUri('%64ata%3Aimage/png;base64,xxx')).to.be.true;
                expect(isDataUri('/%44ATA%3aimage/png')).to.be.true;
            });

            it('should detect multiple leading slash variants', () => {
                expect(isDataUri('//data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('///data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('////data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('///////data:text/html,test')).to.be.true;
            });

            it('should detect data URIs with leading whitespace', () => {
                expect(isDataUri(' data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('  /data:image/png;base64,xxx')).to.be.true;
                expect(isDataUri('\tdata:text/html,test')).to.be.true;
                expect(isDataUri('\n/data:text/html,test')).to.be.true;
            });

            it('should detect combined bypass attempts', () => {
                expect(isDataUri('//DATA:image/png;base64,xxx')).to.be.true;

                expect(isDataUri('//data%3Aimage/png;base64,xxx')).to.be.true;

                expect(isDataUri('  //DaTa:image/png;base64,xxx')).to.be.true;

                expect(isDataUri(' ///%64ATA%3aimage/png')).to.be.true;
            });
        });
    });
});
