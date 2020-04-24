Feature('navbar ilc demo application');

Scenario('should open every page and show a content only of an opened page', async (I, peoplePage, newsPage, planetsPage) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.goToNews, 30);
    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 30);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 30);
    I.see('Pick a news source', newsPage.bannerHeadline);

    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 30);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.dontSeeElement(newsPage.bannerHeadline);
    I.dontSeeElement(newsPage.newsSources);
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 30);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);

    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 30);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSeeElement(peoplePage.fetchMorePeople);
    I.dontSeeElement(peoplePage.selectedPerson);
    I.dontSeeElement(peoplePage.personsList);
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 30);

    I.click('body > div#navbar a[href="/nosuchpath"]');
    I.waitInUrl('/nosuchpath', 30);
    I.waitForText('404 not found', 30, 'body > div#body');
    I.dontSeeElement(planetsPage.selectedPlanet);
    I.dontSeeElement(planetsPage.planetsList);

    I.click(planetsPage.goToPlanets);
    I.waitInUrl(planetsPage.planetsUrl, 30);
    I.seeAttributesOnElements(planetsPage.goToPlanets, {
        'aria-current': 'page',
    });
    I.dontSee('404 not found', 'body > div#body');
    I.see('No planet selected', planetsPage.selectedPlanet);
    I.waitNumberOfVisibleElements(planetsPage.planetsList, 10, 30);

    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 30);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.dontSeeElement(planetsPage.selectedPlanet);
    I.dontSeeElement(planetsPage.planetsList);
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 30);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);

    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 30);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 30);
    I.see('Pick a news source', newsPage.bannerHeadline);
    I.dontSeeElement(peoplePage.selectedPerson);
    I.dontSeeElement(peoplePage.fetchMorePeople);
    I.dontSeeElement(peoplePage.personsList);
});
