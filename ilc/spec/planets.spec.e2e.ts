Feature('planets ilc demo application');

Before((I) => {
    I.startMocking();
    I.mockServer((server) => {
        server.get('https://swapi-v2.herokuapp.com/api/planets/?page=1').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/planets.page.01.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/planets/?page=2').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/planets.page.02.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/people/10/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/people.10.json'));
        });
    });

    I.amOnPage('/');
});

After((I) => {
    I.stopMocking();
});

Scenario('a user tries to interact with a planets page', async (I, planetsPage) => {
    /**
     * Should open a planets page without any selected planet initially
     */
    I.waitInUrl('/', 5);
    I.click(planetsPage.goToPlanets);
    // I.seeElement(planetsPage.ilcSpinner); TODO Need to add a delay
    I.waitInUrl(planetsPage.planetsUrl, 5);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSeeElement(planetsPage.ilcSpinner);
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitForClickable(planetsPage.fetchMorePlanets, 5);
    I.seeNumberOfVisibleElements(planetsPage.planetsList, 10);

    /**
     * Should show more planets when a user clicks to fetch more them
     */
    I.click(planetsPage.fetchMorePlanets);
    I.waitForClickable(planetsPage.fetchMorePlanets, 5);
    I.seeNumberOfVisibleElements(planetsPage.planetsList, 20);

    /**
     * Should show planet`s details when a user choses one of a planets list
     */
    I.scrollPageToBottom();

    const lastPlanetName = await I.grabTextFrom(planetsPage.lastPlanet) as string;
    const lastPlanetHref = await I.grabAttributeFrom(planetsPage.lastPlanet, 'href');

    I.click(planetsPage.lastPlanet);
    I.scrollPageToTop();
    I.waitInUrl(lastPlanetHref, 5);
    I.dontSee('No planet selected', planetsPage.selectedPlanet);
    I.see(lastPlanetName, planetsPage.selectedPlanetName);
    I.seeElement(planetsPage.selectedPlanetTabAttributes);
    I.seeElement(planetsPage.selectedPlanetTabPeople);
    I.seeElement(planetsPage.selectedPlanetTabTodo);

    /**
     * Should open an attributes tab when a user clicks on an attributes tab of a selected planet
     */
    const selectedPlanetTabAttributesHref = await I.grabAttributeFrom(planetsPage.selectedPlanetTabAttributes, 'href');
    const selectedPlanetTabPeopleHref = await I.grabAttributeFrom(planetsPage.selectedPlanetTabPeople, 'href');
    const selectedPlanetTabTodoHref = await I.grabAttributeFrom(planetsPage.selectedPlanetTabTodo, 'href');

    I.click(planetsPage.selectedPlanetTabAttributes);
    I.waitInUrl(selectedPlanetTabAttributesHref, 5);

    I.click(planetsPage.selectedPlanetTabPeople);
    I.waitInUrl(selectedPlanetTabPeopleHref, 5);

    I.click(planetsPage.selectedPlanetTabTodo);
    I.waitInUrl(selectedPlanetTabTodoHref, 5);
});
