Feature('people ilc demo application');

Scenario('should open a people page without any selected planet initially', async ({I, peoplePage}) => {
    I.amOnPage('/');
    I.waitForElement(peoplePage.goToPeople, 30);
    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 30);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.waitForText('No one selected', 10, peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 30);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 10);
});

Scenario('should show more persons', async ({I, peoplePage}) => {
    I.amOnPage(peoplePage.peopleUrl);
    I.waitForElement(peoplePage.fetchMorePeople, 30);
    I.waitForClickable(peoplePage.fetchMorePeople, 30);
    I.click(peoplePage.fetchMorePeople);
    I.waitForClickable(peoplePage.fetchMorePeople, 30);
    I.seeNumberOfVisibleElements(peoplePage.personsList, 20);
    I.stopMocking();
});

Scenario('should show person`s details', async ({I, peoplePage}) => {
    I.amOnPage(peoplePage.peopleUrl);
    I.waitNumberOfVisibleElements(peoplePage.personsList, 10, 30);

    const lastPersonName = await I.grabTextFrom(peoplePage.lastPerson) as string;
    const lastPersonHref = await I.grabAttributeFrom(peoplePage.lastPerson, 'href');

    I.click(peoplePage.lastPerson);
    I.waitInUrl(lastPersonHref, 30);
    I.dontSee('No one selected', peoplePage.selectedPerson);
    I.see(lastPersonName, peoplePage.selectedPerson);
});
