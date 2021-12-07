Feature('navbar ilc demo application');

Scenario('should open every page and show a content only of an opened page', async ({I, peoplePage, newsPage, planetsPage}) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.main), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitInUrl(newsPage.url.main, 10);
    I.seeAttributesOnElements(newsPage.linkWithUrl(newsPage.url.main), {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);

    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 10);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.dontSeeElement(newsPage.bannerHeadline);
    I.dontSeeElement(newsPage.newsSources);
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 10);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);

    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 10);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSeeElement(peoplePage.fetchMorePeople);
    I.dontSeeElement(peoplePage.selectedPerson);
    I.dontSeeElement(peoplePage.personsList);
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 10);

    I.click('body > div#navbar a[href="/nosuchpath"]');
    I.waitInUrl('/nosuchpath', 10);
    I.waitForText('404 not found', 10, 'body > div#body');
    I.dontSeeElement(planetsPage.selectedPlanet);
    I.dontSeeElement(planetsPage.planetsList);

    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 10);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSee('404 not found', 'body > div#body');
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 10);

    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 10);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.dontSeeElement(planetsPage.selectedPlanet);
    I.dontSeeElement(planetsPage.planetsList);
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 10);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);

    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitInUrl(newsPage.url.main, 10);
    I.seeAttributesOnElements(newsPage.linkWithUrl(newsPage.url.main), {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
    I.dontSeeElement(peoplePage.selectedPerson);
    I.dontSeeElement(peoplePage.fetchMorePeople);
    I.dontSeeElement(peoplePage.personsList);
});


Scenario('should open new tab on click with command', async ({I, peoplePage, newsPage}) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.main), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitInUrl(newsPage.url.main, 10);

    I.pressKeyDown('Control');
    I.click(peoplePage.goToPeople);
    I.pressKeyUp('Control');
    I.pressKeyDown('Command');
    I.click(peoplePage.goToPeople);
    I.pressKeyUp('Command');
    I.seeCurrentUrlEquals(newsPage.url.main);

    I.switchToNextTab();
    I.seeCurrentUrlEquals(peoplePage.peopleUrl);
});
