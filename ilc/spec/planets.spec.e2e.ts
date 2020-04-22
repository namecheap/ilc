import * as locators from './locators';

Feature('planets ilc demo application');

Before((I) => {
    // @ts-ignore
    I.mockServer((server) => {
        // @ts-ignore
        server.get('https://swapi-v2.herokuapp.com/api/planets/?page=1').intercept((req, res) => {
            res.status(200).json(require('./data/planets.page.01.json'));
        });

        // @ts-ignore
        server.get('https://swapi-v2.herokuapp.com/api/planets/?page=2').intercept((req, res) => {
            res.status(200).json(require('./data/planets.page.02.json'));
        });

        // @ts-ignore
        server.get('https://swapi-v2.herokuapp.com/api/people/10/').intercept((req, res) => {
            res.status(200).json(require('./data/people.10.json'));
        });
    });

    I.amOnPage('/');
});

Scenario('a user tries to interact with a planets page', async (I) => {
    /**
     * Should open a planets page without any selected planet initially
     */
    I.waitInUrl('/');
    I.click(locators.goToPlanets);
    // I.seeElement(locators.ilcSpinner); TODO Need to add a delay
    I.waitInUrl(locators.planetsUrl);
    I.seeAttributesOnElements(locators.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSeeElement(locators.ilcSpinner);
    I.see('No planet selected', locators.selectedPlanet);
    I.waitForClickable(locators.fetchMorePlanets);
    I.seeNumberOfVisibleElements(locators.planetsList, 10);

    /**
     * Should show more planets when a user clicks to fetch more them
     */
    I.click(locators.fetchMorePlanets);
    I.waitForClickable(locators.fetchMorePlanets);
    I.seeNumberOfVisibleElements(locators.planetsList, 20);

    /**
     * Should show planet`s details when a user choses one of a planets list
     */
    I.scrollPageToBottom();

    const lastPlanetName = await I.grabTextFrom(locators.lastPlanet) as string;
    const lastPlanetHref = await I.grabAttributeFrom(locators.lastPlanet, 'href');

    I.click(locators.lastPlanet);
    I.scrollPageToTop();
    I.waitInUrl(lastPlanetHref);
    I.dontSee('No planet selected', locators.selectedPlanet);
    I.see(lastPlanetName, locators.selectedPlanetName);
    I.seeElement(locators.selectedPlanetTabAttributes);
    I.seeElement(locators.selectedPlanetTabPeople);
    I.seeElement(locators.selectedPlanetTabTodo);

    /**
     * Should open an attributes tab when a user clicks on an attributes tab of a selected planet
     */
    const selectedPlanetTabAttributesHref = await I.grabAttributeFrom(locators.selectedPlanetTabAttributes, 'href');
    const selectedPlanetTabPeopleHref = await I.grabAttributeFrom(locators.selectedPlanetTabPeople, 'href');
    const selectedPlanetTabTodoHref = await I.grabAttributeFrom(locators.selectedPlanetTabTodo, 'href');

    I.click(locators.selectedPlanetTabAttributes);
    I.waitInUrl(selectedPlanetTabAttributesHref);

    I.click(locators.selectedPlanetTabPeople);
    I.waitInUrl(selectedPlanetTabPeopleHref);

    I.click(locators.selectedPlanetTabTodo);
    I.waitInUrl(selectedPlanetTabTodoHref);
});