const locators = require('./locators.e2e');

Feature('planets ilc demo application');

Before((I) => {
  I.amOnPage('/');
});

Scenario('a user tries to interact with a planets page', async (I) => {
  /**
   * Should open a planets page without any selected planet initially
   */
  I.waitInUrl('/');
  I.click(locators.goToPlanets);
  I.seeElement(locators.ilcSpinner);
  I.waitInUrl(locators.planetsUrl);
  I.seeAttributesOnElements(locators.goToPlanets, {
    'aria-current': 'page',
  });
  I.dontSeeElement(locators.ilcSpinner);
  I.see('No planet selected', locators.selectedPlanet);
  I.waitForClickable(locators.fetchMorePlanets, 5);
  I.seeNumberOfVisibleElements(locators.planetsList, 10);

  /**
   * Should show more planets when a user clicks to fetch more them
   */
  I.click(locators.fetchMorePlanets);
  I.waitForClickable(locators.fetchMorePlanets, 5);
  I.seeNumberOfVisibleElements(locators.planetsList, 20);

  /**
   * Should show planet`s details when a user choses one of a planets list
   */
  I.scrollPageToBottom();

  const lastPlanetName = await I.grabTextFrom(locators.lastPlanet);
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