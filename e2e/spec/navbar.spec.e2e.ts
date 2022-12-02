// import { clickOnLink } from './utils';
//
// Feature('navbar ilc demo application');
//
// Scenario('should open every page and show a content only of an opened page', async ({I, peoplePage, newsPage, planetsPage}) => {
//     I.amOnPage('/');
//     clickOnLink(newsPage.url.main, true);
//     I.seeAttributesOnElements(newsPage.linkWithUrl(newsPage.url.main), {
//         'aria-current': 'page',
//     });
//     I.waitForElement(newsPage.newsSources, 10);
//     I.see('Pick a news source', newsPage.bannerHeadline);
//
//     clickOnLink(peoplePage.peopleUrl, true);
//     I.seeAttributesOnElements(peoplePage.goToPeople, {
//         'aria-current': 'page',
//     });
//     I.dontSeeElement(newsPage.bannerHeadline);
//     I.dontSeeElement(newsPage.newsSources);
//     I.see('No one selected', peoplePage.selectedPerson);
//     I.waitForClickable(peoplePage.fetchMorePeople, 10);
//     I.seeNumberOfVisibleElements(peoplePage.personsList, 10);
//
//     clickOnLink(planetsPage.planetsUrl);
//     I.seeAttributesOnElements(planetsPage.goToPlanets, {
//         'aria-current': 'page',
//     });
//     I.dontSeeElement(peoplePage.fetchMorePeople);
//     I.dontSeeElement(peoplePage.selectedPerson);
//     I.dontSeeElement(peoplePage.personsList);
//     I.see('No planet selected', planetsPage.selectedPlanet);
//     I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 10);
//
//     clickOnLink('/nosuchpath');
//     I.waitForText('404 not found', 10, 'body > div#body');
//     I.dontSeeElement(planetsPage.selectedPlanet);
//     I.dontSeeElement(planetsPage.planetsList);
//
//     clickOnLink(planetsPage.planetsUrl);
//     I.seeAttributesOnElements(planetsPage.goToPlanets, {
//         'aria-current': 'page',
//     });
//     I.dontSee('404 not found', 'body > div#body');
//     I.see('No planet selected', planetsPage.selectedPlanet);
//     I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 10);
//
//     clickOnLink(peoplePage.peopleUrl);
//     I.seeAttributesOnElements(peoplePage.goToPeople, {
//         'aria-current': 'page',
//     });
//     I.dontSeeElement(planetsPage.selectedPlanet);
//     I.dontSeeElement(planetsPage.planetsList);
//     I.see('No one selected', peoplePage.selectedPerson);
//     I.waitForClickable(peoplePage.fetchMorePeople, 10);
//     I.seeNumberOfVisibleElements(peoplePage.personsList, 10);
//
//     clickOnLink(newsPage.url.main);
//     I.seeAttributesOnElements(newsPage.linkWithUrl(newsPage.url.main), {
//         'aria-current': 'page',
//     });
//     I.waitForElement(newsPage.newsSources, 10);
//     I.see('Pick a news source', newsPage.bannerHeadline);
//     I.dontSeeElement(peoplePage.selectedPerson);
//     I.dontSeeElement(peoplePage.fetchMorePeople);
//     I.dontSeeElement(peoplePage.personsList);
// });
