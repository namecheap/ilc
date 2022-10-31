import chai from 'chai';
import { getRegistryMock } from '../tests/helpers';
import composeAppSlotPairsToRegister from './composeAppSlotPairsToRegister';
import {getIlcConfigRoot} from './configuration/getIlcConfigRoot';

describe('select slots to register', () => {
    it('should select slots without any duplicated apps of slots from provided routes', () => {
        const routes = [{
            'slots': {
                'navbar': {
                    'appName': '@portal/navbar',
                    'props': {},
                    'kind': null,
                },
                'footer': {
                    'appName': '@portal/footer',
                    'props': {},
                    'kind': null,
                },
            },
            'route': '*',
            'next': true,
            'template': 'master',
            'routeExp': {},
        }, {
            'slots': {
                'body': {
                    'appName': '@portal/news',
                    'props': {},
                    'kind': null,
                },
                'banner': {
                    'appName': '@portal/banner',
                    'props': {},
                    'kind': null,
                },
            },
            'route': '/news/*',
            'next': false,
            'routeExp': {},
        }, {
            'slots': {
                'body': {
                    'appName': '@portal/people',
                    'props': {},
                    'kind': null,
                },
            },
            'route': '/people/*',
            'next': false,
            'routeExp': {},
        }, {
            'slots': {
                'body': {
                    'appName': '@portal/planets',
                    'props': {},
                    'kind': null,
                },
                'banner': {
                    'appName': '@portal/banner',
                    'props': {},
                    'kind': null,
                },
            },
            'route': '/planets/*',
            'next': false,
            'routeExp': {},
        }, {
            'slots': {
                'navbar': {
                    'appName': '@portal/navbar',
                    'props': {},
                    'kind': null,
                },
                'body': {
                    'appName': '@portal/system',
                    'props': {
                        '_statusCode': '404',
                    },
                    'kind': null,
                },
                'banner': {
                    'appName': '@portal/banner',
                    'props': {},
                    'kind': null,
                },
                'footer': {
                    'appName': '@portal/footer',
                    'props': {},
                    'kind': null,
                },
            },
            'route': '',
            'next': false,
            'template': 'master',
        }, {
            'slots': {},
            'route': '/without-any-slots/*',
            'next': false,
            'routeExp': {},
        }];

        const configRoot = getIlcConfigRoot();
        const registryConf = getRegistryMock().getConfig().data;
        registryConf.routes = routes;
        configRoot.registryConfiguration = registryConf;

        const composedAppsJsonified = composeAppSlotPairsToRegister(configRoot).map((item) => item.toJSON());

            chai.expect(composedAppsJsonified).to.be.eql([
            {
                appId: 'navbar__at__navbar',
                appName: '@portal/navbar',
                slotName: 'navbar'
            },
            {
                appId: 'footer__at__footer',
                appName: '@portal/footer',
                slotName: 'footer'
            },
            {
                appId: 'news__at__body',
                appName: '@portal/news',
                slotName: 'body'
            },
            {
                appId: 'banner__at__banner',
                appName: '@portal/banner',
                slotName: 'banner'
            },
            {
                appId: 'people__at__body',
                appName: '@portal/people',
                slotName: 'body'
            },
            {
                appId: 'planets__at__body',
                appName: '@portal/planets',
                slotName: 'body'
            },
            {
                appId: 'system__at__body',
                appName: '@portal/system',
                slotName: 'body'
            }
        ]);
    });
});
