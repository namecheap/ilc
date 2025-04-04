import chai from 'chai';
import sinon from 'sinon';
import { CanonicalTagService } from './CanonicalTagService';
import { context } from '../context/context';
import * as utils from '../../common/utils';
import { IlcIntl, IntlAdapterConfig, RoutingStrategy } from 'ilc-sdk/app';
import config from 'config';

describe('CanonicalTagService', () => {
    const domain = 'example.com';
    const protocol = 'https';
    const url = '/test-page/';
    const locale = 'en';

    const i18nConfig: IntlAdapterConfig = {
        default: {
            locale: 'en',
            currency: 'USD',
        },
        supported: {
            locale: ['en', 'es', 'fr'],
            currency: ['USD'],
        },
        routingStrategy: RoutingStrategy.PrefixExceptDefault,
    };

    let sandbox: sinon.SinonSandbox;
    let contextStoreStub: sinon.SinonStub;
    let configStub: sinon.SinonStub;
    let localizeUrlStub: sinon.SinonStub;
    let addTrailingSlashStub: sinon.SinonStub;
    let removeQueryParamsStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        contextStoreStub = sandbox.stub();
        contextStoreStub.withArgs('domain').returns(domain);
        sandbox.stub(context, 'getStore').returns({ get: contextStoreStub });

        configStub = sandbox.stub(config, 'get');
        configStub.withArgs('client.protocol').returns(protocol);

        localizeUrlStub = sandbox.stub(IlcIntl, 'localizeUrl');
        localizeUrlStub.callsFake((config, url, options) => `${url}?locale=${options.locale || 'default'}`);

        addTrailingSlashStub = sandbox.stub(utils, 'addTrailingSlash');
        addTrailingSlashStub.callsFake((url) => (url.endsWith('/') ? url : `${url}/`));

        removeQueryParamsStub = sandbox.stub(utils, 'removeQueryParams');
        removeQueryParamsStub.callsFake((url) => url.split('?')[0]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should generate canonical tag with default URL when no custom URL is provided', () => {
        const fullUrl = `${protocol}://${domain}${url}`;
        localizeUrlStub.withArgs(i18nConfig, fullUrl, { locale }).returns(`${fullUrl}?locale=${locale}`);
        addTrailingSlashStub.withArgs(`${fullUrl}?locale=${locale}`).returns(`${fullUrl}?locale=${locale}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, i18nConfig);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullUrl}?locale=${locale}/" data-ilc="1" />`);
        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullUrl, { locale })).to.be.true;
        chai.expect(addTrailingSlashStub.calledWith(`${fullUrl}?locale=${locale}`)).to.be.true;
    });

    it('should generate canonical tag with custom URL when provided in route metadata', () => {
        const customPath = '/custom-canonical-path/';
        const routeMeta = { canonicalUrl: customPath };
        const fullCustomUrl = `${protocol}://${domain}${customPath}`;

        localizeUrlStub.withArgs(i18nConfig, fullCustomUrl, { locale }).returns(`${fullCustomUrl}?locale=${locale}`);
        addTrailingSlashStub
            .withArgs(`${fullCustomUrl}?locale=${locale}`)
            .returns(`${fullCustomUrl}?locale=${locale}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, i18nConfig, routeMeta);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullCustomUrl}?locale=${locale}/" data-ilc="1" />`);
        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullCustomUrl, { locale })).to.be.true;
        chai.expect(addTrailingSlashStub.calledWith(`${fullCustomUrl}?locale=${locale}`)).to.be.true;
    });

    it('should use default locale when no locale is provided', () => {
        const defaultLocale = i18nConfig.default.locale;
        const fullUrl = `${protocol}://${domain}${url}`;

        localizeUrlStub
            .withArgs(i18nConfig, fullUrl, { locale: defaultLocale })
            .returns(`${fullUrl}?locale=${defaultLocale}`);
        addTrailingSlashStub
            .withArgs(`${fullUrl}?locale=${defaultLocale}`)
            .returns(`${fullUrl}?locale=${defaultLocale}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, undefined, i18nConfig);

        chai.expect(result).to.equal(
            `<link rel="canonical" href="${fullUrl}?locale=${defaultLocale}/" data-ilc="1" />`,
        );
        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullUrl, { locale: defaultLocale })).to.be.true;
    });

    it('should handle URLs without trailing slash in custom canonical URLs', () => {
        const customPath = '/custom-path-no-slash';
        const routeMeta = { canonicalUrl: customPath };
        const fullCustomUrl = `${protocol}://${domain}${customPath}`;

        localizeUrlStub.withArgs(i18nConfig, fullCustomUrl, { locale }).returns(`${fullCustomUrl}?locale=${locale}`);
        addTrailingSlashStub
            .withArgs(`${fullCustomUrl}?locale=${locale}`)
            .returns(`${fullCustomUrl}?locale=${locale}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, i18nConfig, routeMeta);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullCustomUrl}?locale=${locale}/" data-ilc="1" />`);
    });
});
