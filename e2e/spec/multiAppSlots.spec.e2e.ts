Feature('several apps per slot');

Scenario(
    'renders every app of a multi-app slot, in list order, each in its own container',
    async ({ I, slotsPage }) => {
        I.amOnPage(slotsPage.multiUrl);

        I.waitNumberOfVisibleElements(slotsPage.personsList, 10, 30);
        I.waitNumberOfVisibleElements(slotsPage.planetsList, 10, 30);

        I.seeNumberOfElements(slotsPage.containers, 2);
        I.seeElement(slotsPage.peopleContainer);
        I.seeElement(slotsPage.planetsContainer);

        const order = await I.executeScript(() =>
            Array.from(document.querySelectorAll('body > div#stack > div[data-ilc-app-id]')).map((node) =>
                node.getAttribute('data-ilc-app-id'),
            ),
        );
        I.assertDeepEqual(order, ['people__at__stack', 'planets__at__stack']);
    },
);

Scenario(
    'keeps the apps of a list across client-side navigation inside the list',
    async ({ I, slotsPage, planetsPage }) => {
        I.amOnPage(slotsPage.multiUrl);
        I.waitNumberOfVisibleElements(slotsPage.planetsList, 10, 30);

        // navigate inside one of the apps: the other app of the slot is untouched
        const lastPlanet = `${slotsPage.planetsList}:last-child > a.planet`;
        const lastPlanetHref = (await I.grabAttributeFrom(lastPlanet, 'href')) as string;
        I.click(lastPlanet);
        I.waitInUrl(lastPlanetHref, 30);

        I.seeNumberOfVisibleElements(slotsPage.personsList, 10);
        I.seeElement(slotsPage.peopleContainer);
    },
);

Scenario(
    'server-renders an app of a multi-app slot in its own container and adds the client-only app after it',
    async ({ I, slotsPage }) => {
        I.amOnPage(slotsPage.multiSsrUrl);
        I.waitForText(slotsPage.systemWelcome, 30, slotsPage.systemContainer);
        I.waitNumberOfVisibleElements(slotsPage.personsList, 10, 30);

        // what the server sent: the system fragment wrapped in its own container inside the slot
        const html = (await I.executeScript(() =>
            fetch(location.pathname).then((response) => response.text()),
        )) as string;
        const slotIndex = html.indexOf('id="stack"');
        const containerIndex = html.indexOf('<div data-ilc-app-id="system__at__stack">');
        const ssrContentIndex = html.indexOf('data-ssr-content', containerIndex);
        I.assertAbove(slotIndex, -1);
        I.assertAbove(containerIndex, slotIndex);
        I.assertAbove(ssrContentIndex, containerIndex);
        I.assertNotContain(html, 'people__at__stack');

        // the client adopted the server-rendered container and placed the client-only app after it
        I.seeNumberOfElements(slotsPage.containers, 2);
        I.seeNumberOfElements(slotsPage.systemContainer, 1);
        const order = await I.executeScript(() =>
            Array.from(document.querySelectorAll('body > div#stack > div[data-ilc-app-id]')).map((node) =>
                node.getAttribute('data-ilc-app-id'),
            ),
        );
        I.assertDeepEqual(order, ['system__at__stack', 'people__at__stack']);
    },
);
