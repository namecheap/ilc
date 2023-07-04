const chai = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const _fp = require('lodash/fp');
const { context } = require('../context/context');

const ConfigsInjector = require('./configs-injector');

describe('configs injector', () => {
    const newrelic = {
        getBrowserTimingHeader: sinon.stub(),
    };

    afterEach(() => {
        newrelic.getBrowserTimingHeader.reset();
    });

    it('should return assets to preload', async () => {
        const styleRefs = ['firstStyleRef', 'secondStyleRef'];
        const request = {
            styleRefs,
        };

        const configsInjector = new ConfigsInjector(newrelic);

        const assetsToPreload = await configsInjector.getAssetsToPreload(request);

        chai.expect(assetsToPreload).to.be.eql({
            scriptRefs: [],
            styleRefs,
        });
        chai.expect(request).to.be.eql({
            styleRefs,
        });
    });

    describe('error throwing', () => {
        it('should throw an error when a document is not defined', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveContent = {
                content: null,
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveContent,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have <head> and </head>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveHeadTag = {
                content: '<body>Hi there! I do not have head tag.</body>',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveHeadTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have <head>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveOpenedHeadTag = {
                content: '</head><body>Hi there! I do not have head tag.</body>',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveOpenedHeadTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have </head>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveClosedHeadTag = {
                content: '<head><body>Hi there! I do not have closed head tag.</body>',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveClosedHeadTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have <body> and </body>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveBodyTag = {
                content: '<head></head>Hi there! I do not have body tag.',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveBodyTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have <body>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveOpenedBodyTag = {
                content: '<head></head>Hi there! I do not have opened body tag.</body>',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveOpenedBodyTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });

        it('should throw an error when a document does not have </body>', () => {
            const configsInjector = new ConfigsInjector(newrelic);
            const templateThatDoesNotHaveClosedBodyTag = {
                content: '<head></head><body>Hi there! I do not have closed body tag.',
                styleRefs: [],
            };

            chai.expect(
                configsInjector.inject.bind(
                    configsInjector,
                    { ilcState: { locale: 'en-US' } },
                    {},
                    templateThatDoesNotHaveClosedBodyTag,
                    {},
                ),
            ).to.throw(`Can't inject ILC configs into invalid document.`);
        });
    });

    describe('configs injecting', () => {
        const slots = {
            firstSlot: {
                appName: 'firstApp',
            },
            secondSlot: {
                appName: 'secondApp',
            },
            thirdSlot: {
                appName: 'thirdApp',
            },
            fourthSlot: {
                appName: 'firstApp',
            },
            fifthSlot: {
                appName: 'ssrOnlyApp',
            },
        };

        const registryConfig = {
            templates: {
                firstTemplate: 'firstTemplate',
                secondTemplate: 'secondTemplate',
                thirdTemplate: 'thirdTemplate',
                fourthTemplate: 'fourthTemplate',
            },
            apps: {
                firstApp: {
                    spaBundle: 'https://somewhere.com/firstAppSpaBundle.js',
                    cssBundle: 'https://somewhere.com/firstAppCssBundle.css',
                    dependencies: {
                        firstAppFirstDependency: 'https://somewhere.com/firstAppFirstDependency.js',
                        firstAppSecondDependency: 'https://somewhere.com/firstAppSecondDependency.js',
                    },
                    props: {
                        firstAppFirstProp: 'firstAppFirstProp',
                        firstAppSecondProp: 'firstAppSecondProp',
                    },
                    kind: 'regular',
                    name: 'firstApp',
                    ssr: {
                        firstAppFirstSsrProp: 'firstAppFirstSsrProp',
                        firstAppSecondSsrProp: 'firstAppSecondSsrProp',
                    },
                },
                secondApp: {
                    spaBundle: 'https://somewhere.com/secondAppSpaBundle.js',
                    cssBundle: 'https://somewhere.com/secondAppCssBundle.css',
                    dependencies: {
                        secondAppFirstDependency: 'https://somewhere.com/secondAppFirstDependency.js',
                        secondAppSecondDependency: 'https://somewhere.com/secondAppSecondDependency.js',
                    },
                    props: {
                        secondAppFirstProp: 'secondAppFirstProp',
                        secondAppSecondProp: 'secondAppSecondProp',
                    },
                    kind: 'primary',
                    name: 'secondApp',
                    ssr: {
                        secondAppFirstSsrProp: 'secondAppFirstSsrProp',
                        secondAppSecondSsrProp: 'secondAppSecondSsrProp',
                    },
                    wrappedWith: 'firstApp',
                },
                ssrOnlyApp: {
                    props: {
                        secondAppFirstProp: 'secondAppFirstProp',
                        secondAppSecondProp: 'secondAppSecondProp',
                    },
                    kind: 'regular',
                    name: 'ssrOnlyApp',
                    ssr: {
                        secondAppFirstSsrProp: 'secondAppFirstSsrProp',
                        secondAppSecondSsrProp: 'secondAppSecondSsrProp',
                    },
                },
            },
            routes: [],
            specialRoutes: {},
            settings: {
                globalSpinner: {
                    customHTML:
                        '<div class="customSpinnerHTML">I am spinner</div>' +
                        '<style>' +
                        '.customSpinnerHTML {' +
                        'position: fixed;' +
                        'left: 50%;' +
                        'top: 50%;' +
                        'z-index: 1000;' +
                        '}' +
                        '</style>' +
                        '<script type="text/javascript">' +
                        'console.log("Custom spinner JS")' +
                        '</script>',
                },
                i18n: {
                    enabled: true,
                    default: { locale: 'en-US', currency: 'USD' },
                    supported: {
                        locale: ['en-US', 'ua-UA'],
                        currency: ['USD', 'UAH'],
                    },
                    routingStrategy: 'prefix_except_default',
                },
            },
        };

        registryConfig.apps['thirdApp'] = {
            spaBundle: registryConfig.apps.firstApp.spaBundle,
            cssBundle: registryConfig.apps.secondApp.cssBundle,
            dependencies: {
                thirdAppFirstDependency: registryConfig.apps.firstApp.dependencies.firstAppFirstDependency,
                thirdAppSecondDependency: registryConfig.apps.secondApp.dependencies.secondAppSecondDependency,
            },
            props: {
                thirdAppFirstProp: 'thirdAppFirstProp',
                thirdAppSecondProp: 'thirdAppSecondProp',
            },
            kind: 'essential',
            name: 'thirdApp',
            ssr: {
                thirdAppFirstSsrProp: 'thirdAppFirstSsrProp',
                thirdAppSecondSsrProp: 'thirdAppSecondSsrProp',
            },
        };

        const getSpaConfig = () => {
            const pickApp = _fp.pick(['spaBundle', 'cssBundle', 'dependencies', 'props', 'kind', 'wrappedWith']);

            return JSON.stringify({
                apps: {
                    firstApp: pickApp(registryConfig.apps.firstApp),
                    secondApp: pickApp(registryConfig.apps.secondApp),
                    [registryConfig.apps.ssrOnlyApp.name]: pickApp(registryConfig.apps.ssrOnlyApp),
                    thirdApp: pickApp(registryConfig.apps.thirdApp),
                },
                routes: [],
                specialRoutes: {},
                settings: {
                    globalSpinner: {
                        customHTML:
                            '&lt;div class=&quot;customSpinnerHTML&quot;&gt;I am spinner&lt;/div&gt;' +
                            '&lt;style&gt;' +
                            '.customSpinnerHTML {' +
                            'position: fixed;' +
                            'left: 50%;' +
                            'top: 50%;' +
                            'z-index: 1000;' +
                            '}' +
                            '&lt;/style&gt;' +
                            '&lt;script type=&quot;text/javascript&quot;&gt;' +
                            'console.log(&quot;Custom spinner JS&quot;)' +
                            '&lt;/script&gt;',
                    },
                    i18n: {
                        enabled: true,
                        default: { locale: 'en-US', currency: 'USD' },
                        supported: {
                            locale: ['en-US', 'ua-UA'],
                            currency: ['USD', 'UAH'],
                        },
                        routingStrategy: 'prefix_except_default',
                    },
                },
            });
        };

        it('should inject ILC config & state, polyfills, client js and new relic <script>, route assets style sheets links into the end of <head> tag', () => {
            context.run(
                {
                    request: {
                        raw: {
                            url: 'test/a?test=15',
                            connection: {
                                encrypted: true,
                            },
                        },
                        hostname: 'test.com',
                    },
                },
                () => {
                    const browserTimingHeader = `window.browserTimingHeader = 'Hi there! I should add a timing header.';`;
                    newrelic.getBrowserTimingHeader
                        .withArgs()
                        .returns(`<script defer type="text/javascript">${browserTimingHeader}</script>`);

                    const cdnUrl = 'https://somewhere.com';
                    const nrCustomClientJsWrapper = '<script>%CONTENT%</script>';

                    const configsInjector = new ConfigsInjector(newrelic, cdnUrl, nrCustomClientJsWrapper);

                    const request = { ilcState: { test: 1 }, registryConfig };

                    const firstTemplateStyleRef = 'https://somewhere.com/firstTemplateStyleRef.css';
                    const secondTemplateStyleRef = 'https://somewhere.com/secondTemplateStyleRef.css';

                    const template = {
                        styleRefs: [
                            registryConfig.apps.firstApp.cssBundle,
                            firstTemplateStyleRef,
                            secondTemplateStyleRef,
                            registryConfig.apps.secondApp.cssBundle,
                        ],
                        content:
                            '<html>' +
                            '<head>' +
                            '<title>Configs Injector`s test</title>' +
                            '<link rel="stylesheet" href="https://somewhere.com/style.css">' +
                            '</head>' +
                            '<body>' +
                            '<div>Hi there! I am content.</div>' +
                            '</body>' +
                            '</html>',
                    };

                    chai.expect(
                        configsInjector.inject(request, template, { slots, reqUrl: '/test/route?a=15' }),
                    ).to.be.eql(
                        '<html>' +
                            '<head>' +
                            '<title>Configs Injector`s test</title>' +
                            '<link rel="stylesheet" href="https://somewhere.com/style.css">' +
                            '<!-- TailorX: Ignore during parsing START -->' +
                            '<link rel="stylesheet" href="https://somewhere.com/firstAppCssBundle.css" data-fragment-id="firstApp">' +
                            '<link rel="stylesheet" href="https://somewhere.com/secondAppCssBundle.css" data-fragment-id="secondApp">' +
                            '<!-- TailorX: Ignore during parsing END -->' +
                            '<!-- TailorX: Ignore during parsing START -->' +
                            `<script type="ilc-state">${JSON.stringify(request.ilcState)}</script>` +
                            `<script type="ilc-config">${getSpaConfig()}</script>` +
                            '<script>window.ilcApps = [];</script>' +
                            `<script type="text/javascript">` +
                            `if (!(` +
                            `typeof window.URL === 'function' && ` +
                            `Object.entries && ` +
                            `Object.assign && ` +
                            `DocumentFragment.prototype.append && ` +
                            `Element.prototype.append && ` +
                            `Element.prototype.remove` +
                            `)) {` +
                            `document.write('<script src="${
                                cdnUrl + '/polyfill.min.js'
                            }" type="text/javascript" crossorigin></scr' + 'ipt>');` +
                            `}` +
                            `</script>` +
                            `<script src="${
                                cdnUrl + '/client.js'
                            }" type="text/javascript" crossorigin async></script>` +
                            `<script>${browserTimingHeader}</script>` +
                            `<link rel="alternate" hreflang="en-us" href="https://test.com/test/route/" data-ilc="1" />` +
                            `<link rel="alternate" hreflang="ua-ua" href="https://test.com/ua/test/route/" data-ilc="1" />` +
                            `<link rel="alternate" hreflang="x-default" href="https://test.com/test/route/" data-ilc="1" />` +
                            `<link rel="canonical" href="https://test.com/test/route/" data-ilc="1" />` +
                            '<!-- TailorX: Ignore during parsing END -->' +
                            '</head>' +
                            '<body>' +
                            '<div>Hi there! I am content.</div>' +
                            '</body>' +
                            '</html>',
                    );
                    chai.expect(_.pick(request, ['ilcState', 'styleRefs'])).to.be.eql({
                        ilcState: { test: 1 },
                        styleRefs: [
                            registryConfig.apps.firstApp.cssBundle,
                            registryConfig.apps.secondApp.cssBundle,
                            firstTemplateStyleRef,
                            secondTemplateStyleRef,
                        ],
                    });
                },
            );
        });

        it('should inject ILC config, omit ILC state, polyfills, client js and new relic <script>, route assets style sheets links into a placeholder when a document has one', () => {
            context.run(
                {
                    request: {
                        raw: {
                            url: '/test/a?test=15',
                            connection: {
                                encrypted: true,
                            },
                        },
                        hostname: 'test.com',
                    },
                },
                () => {
                    const browserTimingHeader = `<script defer type="text/javascript">window.browserTimingHeader = 'Hi there! I should add a timing header.';</script>`;
                    newrelic.getBrowserTimingHeader.withArgs().returns(browserTimingHeader);

                    const configsInjector = new ConfigsInjector(newrelic);

                    const request = { registryConfig, ilcState: { locale: 'en-US' } };

                    const template = {
                        styleRefs: [],
                        content:
                            '<html>' +
                            '<head>' +
                            '<!-- ILC_JS -->' +
                            '<title>Configs Injector`s test</title>' +
                            '<!-- ILC_CSS -->' +
                            '<link rel="stylesheet" href="https://somewhere.com/style.css">' +
                            '<!-- ILC_JS -->' +
                            '<!-- ILC_CSS -->' +
                            '</head>' +
                            '<body>' +
                            '<!-- ILC_JS -->' +
                            '<div>Hi there! I am content.</div>' +
                            '<!-- ILC_CSS -->' +
                            '</body>' +
                            '</html>',
                    };

                    chai.expect(
                        configsInjector.inject(request, template, { slots, reqUrl: '/test/route?a=15' }),
                    ).to.be.eql(
                        '<html lang="en-US">' +
                            '<head>' +
                            '<!-- TailorX: Ignore during parsing START -->' +
                            `<script type="ilc-config">${getSpaConfig()}</script>` +
                            '<script>window.ilcApps = [];</script>' +
                            `<script type="text/javascript">` +
                            `if (!(` +
                            `typeof window.URL === 'function' && ` +
                            `Object.entries && ` +
                            `Object.assign && ` +
                            `DocumentFragment.prototype.append && ` +
                            `Element.prototype.append && ` +
                            `Element.prototype.remove` +
                            `)) {` +
                            `document.write('<script src="/_ilc/polyfill.min.js" type="text/javascript" ></scr' + 'ipt>');` +
                            `}` +
                            `</script>` +
                            `<script src="/_ilc/client.js" type="text/javascript"  async></script>` +
                            browserTimingHeader +
                            `<link rel="alternate" hreflang="en-us" href="https://test.com/test/route/" data-ilc="1" />` +
                            `<link rel="alternate" hreflang="ua-ua" href="https://test.com/ua/test/route/" data-ilc="1" />` +
                            `<link rel="alternate" hreflang="x-default" href="https://test.com/test/route/" data-ilc="1" />` +
                            `<link rel="canonical" href="https://test.com/test/route/" data-ilc="1" />` +
                            '<!-- TailorX: Ignore during parsing END -->' +
                            '<title>Configs Injector`s test</title>' +
                            '<!-- TailorX: Ignore during parsing START -->' +
                            '<link rel="stylesheet" href="https://somewhere.com/firstAppCssBundle.css" data-fragment-id="firstApp">' +
                            '<link rel="stylesheet" href="https://somewhere.com/secondAppCssBundle.css" data-fragment-id="secondApp">' +
                            '<!-- TailorX: Ignore during parsing END -->' +
                            '<link rel="stylesheet" href="https://somewhere.com/style.css">' +
                            '<!-- ILC_JS -->' +
                            '<!-- ILC_CSS -->' +
                            '</head>' +
                            '<body>' +
                            '<!-- ILC_JS -->' +
                            '<div>Hi there! I am content.</div>' +
                            '<!-- ILC_CSS -->' +
                            '</body>' +
                            '</html>',
                    );
                    chai.expect(request.styleRefs).to.be.eql([
                        registryConfig.apps.firstApp.cssBundle,
                        registryConfig.apps.secondApp.cssBundle,
                    ]);
                },
            );
        });
    });
});
