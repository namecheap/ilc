Feature('people ilc demo application');

Scenario('should open a people page without any selected planet initially', async (I, peoplePage) => {
    peoplePage.mockFirstPeoplePage();

    I.amOnPage('/');
    I.waitForElement(peoplePage.goToPeople, 5);
    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 5);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 5);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);
});

Scenario('should show more persons', async (I, peoplePage) => {
    peoplePage.mockFirstPeoplePage();
    peoplePage.mockSecondPeoplePage();

    I.amOnPage(peoplePage.peopleUrl);
    I.waitForElement(peoplePage.fetchMorePeople, 5);
    I.waitForClickable(peoplePage.fetchMorePeople, 5);
    I.click(peoplePage.fetchMorePeople);
    I.waitForClickable(peoplePage.fetchMorePeople, 5);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 20);
    I.stopMocking();
});

Scenario('should show person`s details', async (I, peoplePage) => {
    peoplePage.mockFirstPeoplePage();

    I.amOnPage(peoplePage.peopleUrl);
    I.waitNumberOfVisibleElements(peoplePage.personsList, 10, 5);

    const lastPersonName = await I.grabTextFrom(peoplePage.lastPerson) as string;
    const lastPersonHref = await I.grabAttributeFrom(peoplePage.lastPerson, 'href');

    I.click(peoplePage.lastPerson);
    I.waitInUrl(lastPersonHref, 5);
    I.dontSee('No one selected', peoplePage.selectedPerson);
    I.see(lastPersonName, peoplePage.selectedPerson);
});
