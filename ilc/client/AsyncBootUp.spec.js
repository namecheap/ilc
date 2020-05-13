import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import AsyncBootUp from './AsyncBootUp';

describe('async boot up', () => {
    const overrideImportMap = sinon.spy(window.System, 'overrideImportMap');
    const logger = {
        info: sinon.spy(),
    };
    const performance = {
        now: sinon.stub(),
    };

    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();

        overrideImportMap.resetHistory();
        performance.now.reset();
        logger.info.resetHistory();

        while (document.body.lastChild) {
            document.body.removeChild(document.body.lastChild);
        }
    });

    after(() => {
        overrideImportMap.restore();
    });

    it('should throw an error when a slot can not be found on the page by slot name', async () => {
        const slots = {
            undefined: {
                id: 'undefined',
            },
        };

        slots.ref = html`
            <main>
                <div>
                    <div>
                        Hello! I am Undefined SPA.
                        I don't have provided slot id, so I can not be found on the page that is why an error should be threw.
                    </div>
                </div>
            </main>
        `;

        document.body.appendChild(slots.ref);
        window.ilcApps = [];

        const asyncBootUp = new AsyncBootUp(logger, performance);

        let expectedError;

        try {
            await Promise.all([
                asyncBootUp.waitForSlot(slots.undefined.id),

                Promise.resolve()
                    .then(() => window.ilcApps.push(slots.undefined.id))
                    .then(() => clock.runAllAsync())
            ]);
        } catch (error) {
            expectedError = error;
        }

        chai.expect(expectedError).instanceOf(Error);
        chai.expect(expectedError.message).to.be.eql(`Can not find '${slots.undefined.id}' on the page!`);
    });

    it('should not wait for slots that are ready and return default override configs at once', async () => {
        const performanceMillisecondsOnCall = [0, 0.1];

        performance.now
            .onFirstCall().returns(performanceMillisecondsOnCall[0])
            .onSecondCall().returns(performanceMillisecondsOnCall[1]);

        const slots = {
            ready: {
                id: 'ready',
            },
        };

        slots.ref = html`
            <main>
                <div id="${slots.ready.id}">
                    <div>
                        Hello! I am Ready SPA.
                        I should be marked as ready at once.
                    </div>
                </div>
            </main>
        `;

        document.body.appendChild(slots.ref);
        window.ilcApps = [slots.ready.id];

        const asyncBootUp = new AsyncBootUp(logger, performance);

        await clock.runAllAsync();

        const readySlotOverrides = await asyncBootUp.waitForSlot(slots.ready.id);

        chai.expect(readySlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        });

        chai.expect(overrideImportMap.called).to.be.false;

        chai.expect(logger.info.calledOnceWithExactly(
            `ILC: Registering app @${
                slots.ready.id
            } after ${
                (performanceMillisecondsOnCall[1] - performanceMillisecondsOnCall[0])
            } milliseconds.`
        )).to.be.true;
    });

    it('should wait for slots that are not ready and return override configs then', async () => {
        const performanceMillisecondsOnCall = [0, 0.15, 0.25, 0.45];

        performance.now
            .onCall(0).returns(performanceMillisecondsOnCall[0])
            .onCall(1).returns(performanceMillisecondsOnCall[1])
            .onCall(2).returns(performanceMillisecondsOnCall[2])
            .onCall(3).returns(performanceMillisecondsOnCall[3]);

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
                dependencies: {},
            }
        };

        const slots = {
            navbar: {
                id: 'navbar',
            },
            body: {
                id: 'body',
            },
            footer: {
                id: 'footer',
            }
        };

        slots.ref = html`
            <main>
                <div id="${slots.navbar.id}">
                    <div>
                        Hello! I am Navbar SPA.
                        I don't have SPA override config, so I should not override my initial SPA config.
                    </div>
                </div>
                <div id="${slots.body.id}">
                    <div>
                        Hello! I am Body SPA.
                        I have SPA override config, so I should override dependencies and return my override SPA config.
                    </div>
                    <script type="spa-config-override">${JSON.stringify(config.body)}</script>
                </div>
                <div id=${slots.footer.id}">
                    <div>
                        Hello! I am Footer SPA.
                        I have SPA override config, so I should return my override SPA config.
                        But I don't have any dependencies, so I should not override them.
                    </div>
                    <script type="spa-config-override">${JSON.stringify(config.footer)}</script>
                </div>
            </main>
        `;

        document.body.appendChild(slots.ref);
        window.ilcApps = [];

        const asyncBootUp = new AsyncBootUp(logger, performance);
        const [navbarSlotOverrides, bodySlotOverrides, footerSlotOverrides] = await Promise.all([
            asyncBootUp.waitForSlot(slots.navbar.id),
            asyncBootUp.waitForSlot(slots.body.id),
            asyncBootUp.waitForSlot(slots.footer.id),

            Promise.resolve()
                .then(() => window.ilcApps.push(slots.navbar.id))
                .then(() => clock.runAllAsync())
                .then(() => window.ilcApps.push(slots.body.id))
                .then(() => clock.runAllAsync())
                .then(() => window.ilcApps.push(slots.footer.id))
                .then(() => clock.runAllAsync()),
        ]);

        chai.expect(navbarSlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        });
        chai.expect(bodySlotOverrides).to.be.eql({
            spaBundle: config.body.spaBundle,
            cssBundle: config.body.cssBundle,
        });
        chai.expect(footerSlotOverrides).to.be.eql({
            spaBundle: config.footer.spaBundle,
            cssBundle: config.footer.cssBundle,
        });

        chai.expect(overrideImportMap.calledTwice).to.be.true;
        chai.expect(overrideImportMap.getCall(0).args).to.be.eql(['bodyDependency', config.body.dependencies['bodyDependency']]);
        chai.expect(overrideImportMap.getCall(1).args).to.be.eql(['bodyThirdPartyDependency', config.body.dependencies['bodyThirdPartyDependency']]);

        chai.expect(logger.info.getCall(0).args).to.be.eql([
            `ILC: Registering app @${
                slots.navbar.id
            } after ${
                performanceMillisecondsOnCall[1] - performanceMillisecondsOnCall[0]
            } milliseconds.`
        ]);
        chai.expect(logger.info.getCall(1).args).to.be.eql([
            `ILC: Registering app @${
                slots.body.id
            } after ${
                performanceMillisecondsOnCall[2] - performanceMillisecondsOnCall[0]
            } milliseconds.`
        ]);
        chai.expect(logger.info.getCall(2).args).to.be.eql([
            `ILC: Registering app @${
                slots.footer.id
            } after ${
                performanceMillisecondsOnCall[3] - performanceMillisecondsOnCall[0]
            } milliseconds.`
        ]);

        chai.expect(document.getElementById(slots.body.id).innerHTML).does.not.include(
            `<script type="spa-config-override">${JSON.stringify(config.body)}</script>`
        );
        chai.expect(document.getElementById(slots.footer.id).innerHTML).does.not.include(
            `<script type="spa-config-override">${JSON.stringify(config.footer)}</script>`
        );
    });

    it('should not wait for slots after dispatched single-spa`s routing-event and return default override configs at once', async () => {
        const config = {
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
            footer: {
                id: 'footer',
            },
        };

        slots.ref = html`
            <main>
                <div id="${slots.footer.id}">
                    <div>
                        Hello! I am Footer SPA.
                        I have SPA override config, but I am going to be ready after single\`spa routing event.
                        It means I don't have to mark myself as ready and I should not override initial SPA config.
                    </div>
                    <script type="spa-config-override">${JSON.stringify(config.footer)}</script>
                </div>
            </main>
        `;

        document.body.appendChild(slots.ref);
        window.ilcApps = [];

        const asyncBootUp = new AsyncBootUp(logger, performance);
        window.dispatchEvent(new Event('single-spa:routing-event'));
        const footerSlotOverrides = await asyncBootUp.waitForSlot(slots.footer.id);

        chai.expect(footerSlotOverrides).to.be.eql({
            spaBundle: null,
            cssBundle: null,
        });

        chai.expect(overrideImportMap.called).to.be.false;
        chai.expect(logger.info.called).to.be.false;

        chai.expect(document.getElementById(slots.footer.id).innerHTML).includes(
            `<script type="spa-config-override">${JSON.stringify(config.footer)}</script>`
        );
    });
});
