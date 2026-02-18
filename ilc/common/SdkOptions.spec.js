const { expect } = require('chai');
const { SdkOptions } = require('./SdkOptions');

describe('SdkOptions Class', () => {
    it('should return i18n and cssBundle when both are provided', () => {
        const params = {
            i18n: { manifestPath: '/path/to/manifest' },
            cssBundle: '/path/to/cssBundle',
        };
        const sdkOptions = new SdkOptions(params);

        const result = sdkOptions.toJSON();
        expect(result).to.deep.equal({
            i18n: params.i18n,
            cssBundle: params.cssBundle,
        });
    });

    it('should return only i18n when cssBundle is not provided', () => {
        const params = {
            i18n: { manifestPath: '/path/to/manifest' },
        };
        const sdkOptions = new SdkOptions(params);

        const result = sdkOptions.toJSON();
        expect(result).to.deep.equal({
            i18n: params.i18n,
            cssBundle: undefined,
        });
    });

    it('should return only cssBundle when i18n is not provided', () => {
        const params = {
            cssBundle: '/path/to/cssBundle',
        };
        const sdkOptions = new SdkOptions(params);

        const result = sdkOptions.toJSON();
        expect(result).to.deep.equal({
            i18n: undefined,
            cssBundle: params.cssBundle,
        });
    });

    it('should return undefined when no params are provided', () => {
        const sdkOptions = new SdkOptions();

        const result = sdkOptions.toJSON();
        expect(result).to.be.undefined;
    });

    it('should return undefined when i18n does not have manifestPath and cssBundle is not provided', () => {
        const params = {
            i18n: {},
        };
        const sdkOptions = new SdkOptions(params);

        const result = sdkOptions.toJSON();
        expect(result).to.be.undefined;
    });

    it('should return undefined when both i18n and cssBundle are undefined', () => {
        const params = {
            i18n: undefined,
            cssBundle: undefined,
        };
        const sdkOptions = new SdkOptions(params);

        const result = sdkOptions.toJSON();
        expect(result).to.be.undefined;
    });
});
