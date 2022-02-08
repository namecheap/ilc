const chai = require('chai');
const { getFragmentAttributes } = require('../../tests/helpers');
const processFragmentResponse = require('./process-fragment-response')
const errors = require('./errors');

describe('process-fragment-response', () => {
    it('should proceed normal response for non primary', () => {
        const fakeResponse = { statusCode: 200, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: false }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: null }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.not.throw();
        chai.expect(fakeResponse.statusCode).to.be.equal(200);
    });

    it('should proceed normal response for primary', () => {
        const fakeResponse = { statusCode: 200, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: true }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: null }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.not.throw();
    });

    it('should throw fragment 404 for primary non special route', () => {
        const fakeResponse = { statusCode: 404, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: true }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: null }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.throw(errors.Fragment404Response);
    });

    it('should return 404 code for primary special route', () => {
        const fakeResponse = { statusCode: 200, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: true }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: 404 }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.not.throw();
        chai.expect(fakeResponse.statusCode).to.be.equal(404);
    });

    it('should throw error when fragment respond 5** code', () => {
        const fakeResponse = { statusCode: 504, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: false }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: null }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.throw(Error);
    });

    it('should throw error when non-primary fragment respond with not 2** code', () => {
        const fakeResponse = { statusCode: 400, headers: {} };
        const fakeContext = {
            fragmentAttributes: getFragmentAttributes({ primary: false }),
            isWrapper: false,
            request: {
                router: {
                    getRoute: () => ({ specialRole: null }),
                }
            }
        }

        chai.expect(processFragmentResponse.bind(processFragmentResponse, fakeResponse, fakeContext)).to.throw(Error);
    });
});
