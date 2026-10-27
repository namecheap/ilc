Feature('keep-alive slot entries');

Scenario(
    'hides a kept-alive app instead of unmounting it, and shows it again without a remount',
    async ({ I, slotsPage }) => {
        I.amOnPage(slotsPage.keepAlivePeopleUrl);
        I.waitNumberOfVisibleElements(slotsPage.personsList, 10, 30);

        // state inside the kept-alive app: a selected person
        const lastPersonName = (await I.grabTextFrom(slotsPage.lastPerson)) as string;
        const lastPersonHref = (await I.grabAttributeFrom(slotsPage.lastPerson, 'href')) as string;
        I.click(slotsPage.lastPerson);
        I.waitInUrl(lastPersonHref, 30);
        I.see(lastPersonName, slotsPage.selectedPerson);

        slotsPage.recordVisibilityEvents();

        // another app takes the slot: people is hidden, not unmounted
        slotsPage.navigate(slotsPage.keepAlivePlanetsUrl);
        I.waitInUrl(slotsPage.keepAlivePlanetsUrl, 30);
        I.waitNumberOfVisibleElements(slotsPage.planetsList, 10, 30);

        I.seeElementInDOM(slotsPage.peopleContainer);
        I.dontSeeElement(slotsPage.peopleContainer);
        I.seeElementInDOM(slotsPage.selectedPerson);

        // the route lists people again: shown, state intact, no remount
        slotsPage.navigate(lastPersonHref);
        I.waitInUrl(lastPersonHref, 30);
        I.waitForVisible(slotsPage.peopleContainer, 30);

        I.see(lastPersonName, slotsPage.selectedPerson);
        I.dontSeeElement(slotsPage.planetsView);

        const events = (await slotsPage.grabVisibilityEvents()) as Array<Record<string, unknown>>;
        I.assertDeepEqual(
            events.map(({ appName, slotName, visible }) => ({ appName, slotName, visible })),
            [
                { appName: '@portal/people', slotName: 'stack', visible: false },
                { appName: '@portal/people', slotName: 'stack', visible: true },
            ],
        );
    },
);

Scenario('unmounts the regular app of the same slot as before', async ({ I, slotsPage }) => {
    I.amOnPage(slotsPage.keepAlivePlanetsUrl);
    I.waitNumberOfVisibleElements(slotsPage.planetsList, 10, 30);

    slotsPage.navigate(slotsPage.keepAlivePeopleUrl);
    I.waitInUrl(slotsPage.keepAlivePeopleUrl, 30);
    I.waitNumberOfVisibleElements(slotsPage.personsList, 10, 30);

    // planets has no keepAlive: its container stays empty after the unmount
    I.dontSeeElementInDOM(slotsPage.planetsView);
});

Scenario('hides and shows a server-rendered kept-alive app without a remount', async ({ I, slotsPage }) => {
    I.amOnPage(slotsPage.keepAliveSsrUrl);
    I.waitForText(slotsPage.systemWelcome, 30, slotsPage.systemContainer);

    // a remount would rebuild the server-rendered DOM and lose this marker
    I.executeScript(
        (selector: string) =>
            document.querySelector(selector)!.firstElementChild!.setAttribute('data-e2e-marker', 'kept'),
        slotsPage.systemContainer,
    );
    slotsPage.recordVisibilityEvents();

    slotsPage.navigate(slotsPage.keepAlivePlanetsUrl);
    I.waitInUrl(slotsPage.keepAlivePlanetsUrl, 30);
    I.waitNumberOfVisibleElements(slotsPage.planetsList, 10, 30);

    I.seeElementInDOM(slotsPage.systemContainer);
    I.dontSeeElement(slotsPage.systemContainer);

    slotsPage.navigate(slotsPage.keepAliveSsrUrl);
    I.waitInUrl(slotsPage.keepAliveSsrUrl, 30);
    I.waitForVisible(slotsPage.systemContainer, 30);

    I.see(slotsPage.systemWelcome, slotsPage.systemContainer);
    I.seeElementInDOM(`${slotsPage.systemContainer} > [data-e2e-marker="kept"]`);
    I.dontSeeElement(slotsPage.planetsView);

    const events = (await slotsPage.grabVisibilityEvents()) as Array<Record<string, unknown>>;
    I.assertDeepEqual(
        events.map(({ appName, slotName, visible }) => ({ appName, slotName, visible })),
        [
            { appName: '@portal/system', slotName: 'stack', visible: false },
            { appName: '@portal/system', slotName: 'stack', visible: true },
        ],
    );
});
