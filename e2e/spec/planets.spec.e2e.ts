Feature('planets ilc demo application');

Scenario('should open a planets page without any selected planet initially', async ({I, planetsPage: planetsPage}) => {
    I.amOnPage('/');
    I.waitForElement(planetsPage.goToPlanets, 30);
    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 30);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 30);
});

Scenario('should show more planets', async ({I, planetsPage: planetsPage}) => {
    I.amOnPage(planetsPage.planetsUrl);
    I.waitForElement(planetsPage.fetchMorePlanets, 30);
    I.waitForClickable(planetsPage.fetchMorePlanets, 30);
    I.click(planetsPage.fetchMorePlanets);
    I.waitForClickable(planetsPage.fetchMorePlanets, 30);
    I.seeNumberOfVisibleElements(planetsPage.planetsList, 20);
    I.stopMocking();
});

Scenario('should show planet`s details', async ({I, planetsPage: planetsPage}) => {
    I.amOnPage(planetsPage.planetsUrl);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 30);
    I.seeElement(planetsPage.lastPlanet);

    const lastPlanetName = await I.grabTextFrom(planetsPage.lastPlanet) as string;
    const lastPlanetHref = await I.grabAttributeFrom(planetsPage.lastPlanet, 'href');

    I.click(planetsPage.lastPlanet);
    I.waitInUrl(lastPlanetHref, 30);
    I.dontSee('No planet selected', planetsPage.selectedPlanet);

    I.see(lastPlanetName, planetsPage.selectedPlanetName);

    I.seeElement(planetsPage.selectedPlanetTabAttributes);
    I.seeElement(planetsPage.selectedPlanetTabPeople);

    const selectedPlanetTabAttributesHref = await I.grabAttributeFrom(planetsPage.selectedPlanetTabAttributes, 'href');
    const selectedPlanetTabPeopleHref = await I.grabAttributeFrom(planetsPage.selectedPlanetTabPeople, 'href');

    I.click(planetsPage.selectedPlanetTabAttributes);
    I.waitInUrl(selectedPlanetTabAttributesHref, 30);

    I.click(planetsPage.selectedPlanetTabPeople);
    I.waitInUrl(selectedPlanetTabPeopleHref, 30);
});
