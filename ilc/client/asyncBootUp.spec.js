import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import * as asyncBootUp from './asyncBootUp';

describe('async boot up', () => {
    const config = {
        body: {
            spaBundle: 'here/body-spa-bundle.js',
            cssBundle: 'here/body-css-bundle.css',
            dependencies: {
                bodyDependency: 'here/body-dependency',
                bodyThirdPartyDependency: 'there/body-third-party-dependency',
            },
        },
        footer: {
            spaBundle: 'here/footer-spa-bundle.js',
            cssBundle: 'here/footer-css-bundle.css',
            dependencies: {
                footerDependency: 'here/footer-dependency',
                footerThirdPartyDependency: 'there/footer-third-party-dependency',
            },
        }
    };

    const slots = {
        ready: {
            id: 'ready',
        },
        navbar: {
            id: 'navbar',
        },
        body: {
            id: 'body',
        },
        footer: {
            id: 'footer',
        },
        resetRef: () => {
            slots.ref = html`
                <main>
                    <script>window.ilcApps = ['${slots.ready.id}'];</script>
                    <div>
                        <div id=${slots.ready.id}">
                            <div>
                                Hello! I am Ready SPA.
                                I should be marked as ready at once.
                            </div>
                        </div>
                        <div id="${slots.navbar.id}">
                            <div>
                                Hello! I am Navbar SPA.
                                I don't have SPA override config, so I should not override initial SPA config.
                            </div>
                        </div>
                        <div id="${slots.body.id}">
                            <div>
                                Hello! I am Body SPA.
                                I have SPA override config, so I should override initial SPA config.
                            </div>
                            <script type="spa-config-override">${JSON.stringify(config.body)}</script>
                        </div>
                        <div id="${slots.footer.id}">
                            <div>
                                Hello! I am Footer SPA.
                                I have SPA override config, but I am going to be ready after single\`spa routing event.
                                It means I don't have to mark myself as ready and I should not override initial SPA config.
                            </div>
                            <script type="spa-config-override">${JSON.stringify(config.footer)}</script>
                        </div>
                    </div>
                </main>
            `;
        },
    };


    const overrideImportMap = sinon.spy(window.System, 'overrideImportMap');

    let clock;

    beforeEach(() => {
        slots.resetRef();
        document.body.appendChild(slots.ref);
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
        document.body.removeChild(slots.ref);
        overrideImportMap.resetHistory();
    });

    it('should wait for slots before single-spa`s routing-event, mark apps as ready if they exist and return override configs then', async () => {
        asyncBootUp.init();

        const [readySlotOverrides, navbarSlotOverrides, bodySlotOverrides] = await Promise.all([
            asyncBootUp.waitForSlot(slots.ready.id),
            asyncBootUp.waitForSlot(slots.navbar.id),
            asyncBootUp.waitForSlot(slots.body.id),

            new Promise((resolve) => {
                window.ilcApps.push(slots.navbar.id);
                window.ilcApps.push(slots.body.id);

                resolve();
            }).then(() => clock.runAllAsync()),
        ]);

        window.dispatchEvent(new Event('single-spa:routing-event'));

        const [footerSlotOverrides] = await Promise.all([
            asyncBootUp.waitForSlot(slots.footer.id),

            new Promise((resolve) => {
                window.ilcApps.push(slots.footer.id);

                resolve();
            }).then(() => clock.runAllAsync()),
        ]);

        chai.expect(readySlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        })
        chai.expect(navbarSlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        });
        chai.expect(bodySlotOverrides).to.be.eql({
            spaBundle: config.body.spaBundle,
            cssBundle: config.body.cssBundle,
        });
        chai.expect(footerSlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        });

        chai.expect(overrideImportMap.calledTwice).to.be.true;
        chai.expect(overrideImportMap.getCall(0).args).to.be.eql(['bodyDependency', config.body.dependencies['bodyDependency']]);
        chai.expect(overrideImportMap.getCall(1).args).to.be.eql(['bodyThirdPartyDependency', config.body.dependencies['bodyThirdPartyDependency']]);

        chai.expect(document.getElementById(slots.body.id).innerHTML).not.includes(`<script type="spa-config-override">${JSON.stringify(config.body)}</script>`);
        chai.expect(document.getElementById(slots.footer.id).innerHTML).includes(`<script type="spa-config-override">${JSON.stringify(config.footer)}</script>`);
    });
});
