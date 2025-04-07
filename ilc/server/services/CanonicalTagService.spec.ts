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
        localizeUrlStub.callsFake((config, url, options) => {
            const locale = options.locale || 'default';
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            if (locale === config.default.locale) {
                return url;
            }

            const localizedPath = `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
            return `${urlObj.protocol}//${urlObj.host}${localizedPath}`;
        });

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
        localizeUrlStub.withArgs(i18nConfig, fullUrl, { locale }).returns(fullUrl);
        addTrailingSlashStub.withArgs(fullUrl).returns(`${fullUrl}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, i18nConfig);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullUrl}/" data-ilc="1" />`);
        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullUrl, { locale })).to.be.true;
        chai.expect(addTrailingSlashStub.calledWith(fullUrl)).to.be.true;
    });

    it('should generate canonical tag with custom URL when provided in route metadata', () => {
        const customPath = '/custom-canonical-path/';
        const routeMeta = { canonicalUrl: customPath };
        const fullCustomUrl = `${protocol}://${domain}${customPath}`;

        localizeUrlStub.withArgs(i18nConfig, fullCustomUrl, { locale }).returns(fullCustomUrl);
        addTrailingSlashStub.withArgs(fullCustomUrl).returns(fullCustomUrl);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, i18nConfig, routeMeta);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullCustomUrl}" data-ilc="1" />`);
        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullCustomUrl, { locale })).to.be.true;
        chai.expect(addTrailingSlashStub.calledWith(fullCustomUrl)).to.be.true;
    });

    it('should use default locale when no locale is provided', () => {
        const defaultLocale = i18nConfig.default.locale;
        const fullUrl = `${protocol}://${domain}${url}`;

        removeQueryParamsStub.withArgs(fullUrl).returns(fullUrl);
        localizeUrlStub.withArgs(i18nConfig, fullUrl, { locale: defaultLocale }).returns(fullUrl);
        addTrailingSlashStub.withArgs(fullUrl).returns(`${fullUrl}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, undefined, i18nConfig);

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullUrl}/" data-ilc="1" />`);
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

    it('should handle case when locale is undefined', () => {
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

        const fullUrl = `${protocol}://${domain}${url}`;

        const undefinedLocale = undefined;

        localizeUrlStub
            .withArgs(i18nConfig, fullUrl, { locale: i18nConfig.default.locale })
            .returns(`${fullUrl}?locale=${i18nConfig.default.locale}`);

        addTrailingSlashStub
            .withArgs(`${fullUrl}?locale=${i18nConfig.default.locale}`)
            .returns(`${fullUrl}?locale=${i18nConfig.default.locale}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, undefinedLocale, i18nConfig);

        chai.expect(localizeUrlStub.calledWith(i18nConfig, fullUrl, { locale: i18nConfig.default.locale })).to.be.true;

        chai.expect(result).to.equal(
            `<link rel="canonical" href="${fullUrl}?locale=${i18nConfig.default.locale}/" data-ilc="1" />`,
        );
    });

    it('should handle case when both locale is undefined and i18nConfig has no default locale set', () => {
        const partialI18nConfig = {
            supported: {
                locale: ['en'],
                currency: ['USD'],
            },
            routingStrategy: RoutingStrategy.PrefixExceptDefault,
        } as IntlAdapterConfig;

        const fullUrl = `${protocol}://${domain}${url}`;
        const undefinedLocale = undefined;

        localizeUrlStub.withArgs(partialI18nConfig, fullUrl, { locale: undefined }).returns(`${fullUrl}?no-locale`);

        addTrailingSlashStub.withArgs(`${fullUrl}?no-locale`).returns(`${fullUrl}?no-locale/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, undefinedLocale, partialI18nConfig);

        chai.expect(localizeUrlStub.calledWith(partialI18nConfig, fullUrl, { locale: undefined })).to.be.true;

        chai.expect(result).to.equal(`<link rel="canonical" href="${fullUrl}?no-locale/" data-ilc="1" />`);
    });

    it('should handle case when i18nConfig is null', () => {
        const fullUrl = `${protocol}://${domain}${url}`;
        const locale = 'en';

        localizeUrlStub.withArgs(null, fullUrl, { locale }).returns(fullUrl);

        addTrailingSlashStub.withArgs(fullUrl).returns(`${fullUrl}/`);

        const result = CanonicalTagService.getCanonicalTagForUrlAsHTML(url, locale, null as any);

        chai.expect(localizeUrlStub.calledWith(null, fullUrl, { locale })).to.be.true;
        chai.expect(result).to.equal(`<link rel="canonical" href="${fullUrl}/" data-ilc="1" />`);
    });
});
