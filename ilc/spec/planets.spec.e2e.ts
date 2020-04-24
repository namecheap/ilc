Feature('planets ilc demo application');

Scenario('should open a planets page without any selected planet initially', async (I, planetsPage) => {
    planetsPage.mockFirstPlanetsPage();

    I.amOnPage('/');
    I.waitForElement(planetsPage.goToPlanets, 5);
    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 5);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 5);
});

Scenario('should show more planets', async (I, planetsPage) => {
    planetsPage.mockFirstPlanetsPage();
    planetsPage.mockSecondPlanetsPage();

    I.amOnPage(planetsPage.planetsUrl);
    I.waitForElement(planetsPage.fetchMorePlanets);
    I.waitForClickable(planetsPage.fetchMorePlanets, 5);
    I.click(planetsPage.fetchMorePlanets);
    I.waitForClickable(planetsPage.fetchMorePlanets, 5);
    I.seeNumberOfVisibleElements(planetsPage.planetsList, 20);
    I.stopMocking();
});

Scenario('should show planet`s details', async (I, planetsPage) => {
    planetsPage.mockFirstPlanetsPage();

    I.amOnPage(planetsPage.planetsUrl);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 5);
    I.seeElement(planetsPage.lastPlanet);

    const lastPlanetName = await I.grabTextFrom(planetsPage.lastPlanet) as string;
    const lastPlanetHref = await I.grabAttributeFrom(planetsPage.lastPlanet, 'href');

    I.click(planetsPage.lastPlanet);
    I.waitInUrl(lastPlanetHref, 5);
    I.dontSee('No planet selected', planetsPage.selectedPlanet);
    I.see(lastPlanetName, planetsPage.selectedPlanetName);

    I.seeElement(planetsPage.selectedPlanetTabAttributes);
    I.seeElement(planetsPage.selectedPlanetTabPeople);
    I.seeElement(planetsPage.selectedPlanetTabTodo);

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
