import * as locators from './locators';

Feature('people ilc demo application');

Before((I) => {
  I.amOnPage('/');
});

Scenario('a user tries to interact with a people page', async (I) => {
  /**
   * Should open a people page without any selected planet initially
   */
  I.waitInUrl('/');
  I.click(locators.goToPeople);
  I.seeElement(locators.ilcSpinner);
  I.waitInUrl(locators.peopleUrl);
  I.seeAttributesOnElements(locators.goToPeople, {
    'aria-current': 'page',
  });
  I.dontSeeElement(locators.ilcSpinner);
  I.see('No one selected', locators.selectedPerson);
  I.waitForClickable(locators.fetchMorePeople, 5);
  I.seeNumberOfVisibleElements(locators.personsList, 10);

  /**
   * Should show more persons when a user clicks to fetch more them
   */
  I.click(locators.fetchMorePeople);
  I.waitForClickable(locators.fetchMorePeople, 5);
  I.seeNumberOfVisibleElements(locators.personsList, 20);

  /**
   * Should show person`s details when a user choses one of a people list
   */
  I.scrollPageToBottom();

  const lastPersonName = await I.grabTextFrom(locators.lastPerson) as string;
  const lastPersonHref = await I.grabAttributeFrom(locators.lastPerson, 'href');

  I.click(locators.lastPerson);
  I.scrollPageToTop();
  I.waitInUrl(lastPersonHref);
  I.dontSee('No planet selected', locators.selectedPerson);
  I.see(lastPersonName, locators.selectedPerson);
});