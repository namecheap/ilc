Feature('ilc demo apps');

Before((I) => {
    I.amOnPage('/');
});

const planetsUrl = '/planets';

const goToPlanets = 'body > div#navbar a[href="/planets"]';
const planetsView = 'body > div#body > div.single-spa-container > div.view';
const fetchMorePlanets = `${planetsView} > div.left > div.planetList > button.brand-button`;
const selectedPlanet = `${planetsView} > div.right > div > div.selectedPlanet`;
const selectedPlanetName = `${selectedPlanet} > div > div:first-child > div.header`;
const selectedPlanetTabs = `${selectedPlanet} > div > div:last-child > div.tabs`;
const selectedPlanetTabAttributes = `${selectedPlanetTabs} > a.tabLink:nth-child(1)`;
const selectedPlanetTabPeople = `${selectedPlanetTabs} > a.tabLink:nth-child(2)`;
const selectedPlanetTabTodo = `${selectedPlanetTabs} > a.tabLink:nth-child(3)`;
const planetsList = `${planetsView} > div.left > div.planetList > div`;
const lastPlanet = `${planetsList}:last-child > a.planet`;

Scenario('a user tries to interact with a planets page', async (I) => {
    /**
     * Should open a planets page without any selected planet initially
     */
    I.waitInUrl('/');
    I.click(goToPlanets);
    I.waitInUrl(planetsUrl);
    I.seeAttributesOnElements(goToPlanets, {
      'aria-current': 'page',
    });
    I.see('No planet selected', selectedPlanet);
    I.waitForClickable(fetchMorePlanets, 5);
    I.seeNumberOfVisibleElements(planetsList, 10);

    /**
     * Should show more planets when a user clicks to fetch more them
     */
    I.click(fetchMorePlanets);
    I.waitForClickable(fetchMorePlanets, 5);
    I.seeNumberOfVisibleElements(planetsList, 20);

    /**
     * Should show planet`s details when a user choses one of a planets list
     */
    I.scrollPageToBottom();

    const lastPlanetName = await I.grabTextFrom(lastPlanet);
    const lastPlanetHref = await I.grabAttributeFrom(lastPlanet, 'href');

    I.click(lastPlanet);
    I.scrollPageToTop();
    I.waitInUrl(lastPlanetHref);
    I.dontSee('No planet selected', selectedPlanet);
    I.see(lastPlanetName, selectedPlanetName);
    I.seeElement(selectedPlanetTabAttributes);
    I.seeElement(selectedPlanetTabPeople);
    I.seeElement(selectedPlanetTabTodo);

    /**
     * Should open an attributes tab when a user clicks on an attributes tab of a selected planet
     */
    const selectedPlanetTabAttributesHref = await I.grabAttributeFrom(selectedPlanetTabAttributes, 'href');
    const selectedPlanetTabPeopleHref = await I.grabAttributeFrom(selectedPlanetTabPeople, 'href');
    const selectedPlanetTabTodoHref = await I.grabAttributeFrom(selectedPlanetTabTodo, 'href');

    I.click(selectedPlanetTabAttributes);
    I.waitInUrl(selectedPlanetTabAttributesHref);

    I.click(selectedPlanetTabPeople);
    I.waitInUrl(selectedPlanetTabPeopleHref);

    I.click(selectedPlanetTabTodo);
    I.waitInUrl(selectedPlanetTabTodoHref);
});

const peopleUrl = '/people';

const goToPeople = 'body > div#navbar a[href="/people"]';
const peopleView = 'body > div#body > div.peoplePage > div.peoplePageContents';
const lastPerson = `${peopleView} > div.listWrapper > div.peopleList > a.person:last-child`;
const fetchMorePeople = `${peopleView} > div.listWrapper > button.brand-button`;
const selectedPerson = `${peopleView} > div.selectedWrapper > div.selectedPerson > div.selectedPerson`;
const personsList = `${peopleView} > div.listWrapper > div.peopleList > a.person`;

Scenario('a user tries to interact with a people page', async (I) => {
  /**
   * Should open a people page without any selected planet initially
   */
  I.waitInUrl('/');
  I.click(goToPeople);
  I.waitInUrl(peopleUrl);
  I.seeAttributesOnElements(goToPeople, {
    'aria-current': 'page',
  });
  I.see('No one selected', selectedPerson);
  I.waitForClickable(fetchMorePeople, 5);
  I.seeNumberOfVisibleElements(personsList, 10);

  /**
   * Should show more persons when a user clicks to fetch more them
   */
  I.click(fetchMorePeople);
  I.waitForClickable(fetchMorePeople, 5);
  I.seeNumberOfVisibleElements(personsList, 20);

  /**
   * Should show person`s details when a user choses one of a people list
   */
  I.scrollPageToBottom();

  const lastPersonName = await I.grabTextFrom(lastPerson);
  const lastPersonHref = await I.grabAttributeFrom(lastPerson, 'href');

  I.click(lastPerson);
  I.scrollPageToTop();
  I.waitInUrl(lastPersonHref);
  I.dontSee('No planet selected', selectedPerson);
  I.see(lastPersonName, selectedPerson);
});

const newsUrl = '/news/';

const goToNews = `body > div#navbar a[href="${newsUrl}"]`;
const newsView = 'body > div#body > div.single-spa-container > div.view';
const goToNewsSources = `${newsView} > div.container > p.home > a[href="${newsUrl}"]`;
const newsSources = `${newsView} > div.sources`;
const bannerHeadline = `${newsView} > div.banner > h1`;
const generateError = `${newsView} > div.banner > a`;
const lastNewsSource = `${newsView} > div.sources > div.container > ol > li.source:last-child`;
const lastNewsSourceLink = `${lastNewsSource} > p.action > a`;
const newsSourceArticles = `${newsView} > div.container > div.articles > ol > li.article`;

Scenario('a user tries to interact with a news page', async (I) => {
  I.click(goToNews);
  I.waitInUrl(newsUrl);
  I.seeAttributesOnElements(goToNews, {
    'aria-current': 'page',
  });
  I.waitForElement(newsSources, 5);
  I.see('Pick a news source', bannerHeadline);

  I.scrollPageToBottom();

  const lastNewsSourceLinkHref = await I.grabAttributeFrom(lastNewsSourceLink, 'href');

  I.click(lastNewsSourceLink);
  I.seeInCurrentUrl(lastNewsSourceLinkHref);
  I.scrollPageToTop();
  I.waitNumberOfVisibleElements(newsSourceArticles, 10);

  I.click(goToNewsSources);
  I.waitInUrl(newsUrl);
  I.waitForElement(newsSources, 5);
  I.see('Pick a news source', bannerHeadline);

  I.click(generateError);
  I.waitForText('Error ID', 5);
  I.seeInCurrentUrl(newsUrl);
});

Scenario('a user tries to interact with a nonexistent page', (I) => {
  I.amOnPage('/nonexistent-path');
  I.see('404 not found', 'body > div#body');
});
