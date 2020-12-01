import {expect} from 'chai';
import sinon from 'sinon';

import I18n from './i18n';
import Cookies from 'js-cookie';
import i18nCookie from "../common/i18nCookie";

describe('I18n', () => {
    const intlChangeEvent = sinon.spy();
    window.addEventListener('ilc:intl-update', intlChangeEvent);

    const singleSpaMock = (url) => {
        if (url) {
            history.pushState({}, undefined, url);
        }
        window.dispatchEvent(new Event('single-spa:before-mount-routing-event'));
    };
    const singleSpa = {
        navigateToUrl: sinon.spy(singleSpaMock),
        triggerAppChange: sinon.spy(singleSpaMock),
    };
    const transactionManager = {
        handleAsyncAction: sinon.spy(),
    }
    const defaultConfig = Object.freeze({
        default: { locale: 'en-US', currency: 'USD' },
        supported: {
            locale: ['en-US', 'ua-UA'],
            currency: ['USD', 'UAH']
        },
        routingStrategy: 'prefix_except_default',
    });
    const appErrorHandlerFactory = sinon.spy();

    let defaultIntl;

    beforeEach(() => {
        sinon.resetHistory();
        history.replaceState({}, undefined, '/');

        Cookies.set(i18nCookie.name, i18nCookie.encode(defaultConfig.default), i18nCookie.getOpts());

        defaultIntl = new I18n({...defaultConfig}, singleSpa, appErrorHandlerFactory, transactionManager);
    });

    afterEach(() => {
        defaultIntl.destroy();
    })

    describe('unlocalizeUrl', () => {
        it('should unlocalize URL with locale correctly', () => {
            expect(defaultIntl.unlocalizeUrl('/ua/tst')).to.equal('/tst');
        });

        it('should unlocalize URL without locale correctly', () => {
            expect(defaultIntl.unlocalizeUrl('/tst')).to.equal('/tst');
        });
    });

    describe('adapter.get', () => {
        it('returns default locale', () => {
            const adapter = defaultIntl.getAdapter();

            expect(adapter.get()).to.eql(defaultConfig.default);
        });

        it('returns custom set locale', () => {
            Cookies.set(i18nCookie.name, i18nCookie.encode({...defaultConfig.default, locale: 'ua-UA'}), i18nCookie.getOpts());
            document.documentElement.lang = 'ua-UA';

            const adapter = defaultIntl.getAdapter();

            expect(adapter.get()).to.eql({...defaultConfig.default, locale: 'ua-UA'});
        });
    });

    describe('adapter.set', () => {
        it('doesn\'t accept unsupported/invalid locale or currency', () => {
            const adapter = defaultIntl.getAdapter();

            expect(() => adapter.set({locale: 'pt-BR'})).to.throw(Error);
            expect(() => adapter.set({locale: 'bd-SM'})).to.throw(Error);
            expect(() => adapter.set({currency: 'AED'})).to.throw(Error);
            expect(() => adapter.set({currency: 'BDS'})).to.throw(Error);
        });

        it('triggers URL & document lang change when locale changes', () => {
            const adapter = defaultIntl.getAdapter();

            adapter.set({locale: 'ua-UA'});

            sinon.assert.calledOnceWithExactly(singleSpa.navigateToUrl, `/ua/`);
            sinon.assert.notCalled(singleSpa.triggerAppChange);
            expect(document.documentElement.lang).to.eq('ua-UA');
        });

        it('triggers app change when only currency changes', () => {
            const adapter = defaultIntl.getAdapter();

            adapter.set({currency: 'UAH'});

            sinon.assert.calledOnce(singleSpa.triggerAppChange);
            sinon.assert.notCalled(singleSpa.navigateToUrl);
        });

        it('triggers "ilc:intl-update" when only locale changes', () => {
            const adapter = defaultIntl.getAdapter();

            const newConf = {...adapter.get(), locale: 'ua-UA'};

            adapter.set({locale: newConf.locale});
            sinon.assert.calledOnceWithExactly(intlChangeEvent, sinon.match({detail: newConf}));
        });

        it('triggers "ilc:intl-update" when only currency changes', () => {
            const adapter = defaultIntl.getAdapter();

            const newConf = {...adapter.get(), currency: 'UAH'};

            adapter.set({currency: newConf.currency});
            sinon.assert.calledOnceWithExactly(intlChangeEvent, sinon.match({detail: newConf}));
        });

        it('triggers "ilc:intl-update" when locale & currency change', () => {
            const adapter = defaultIntl.getAdapter();

            const newConf = {locale: 'ua-UA', currency: 'UAH'};

            adapter.set(newConf);
            sinon.assert.calledOnceWithExactly(intlChangeEvent, sinon.match({detail: newConf}));
        });
    });
});
