import * as locators from './locators';

Feature('people ilc demo application');

Before((I) => {
    I.startMocking();
    I.mockServer((server) => {
        server.get('https://swapi-v2.herokuapp.com/api/people/?page=1').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/people.page.01.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/people/?page=2').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/people.page.02.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/planets/8/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/planet.08.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/films/2/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/film.02.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/films/3/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/film.03.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/films/4/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/film.04.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/films/5/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/film.05.json'));
        });

        server.get('https://swapi-v2.herokuapp.com/api/films/6/').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/film.06.json'));
        });
    });

    I.amOnPage('/');
});

After((I) => {
    I.stopMocking();
});

Scenario('a user tries to interact with a people page', async (I) => {
    /**
     * Should open a people page without any selected planet initially
     */
    I.waitInUrl('/');
    I.click(locators.goToPeople);
    // I.seeElement(locators.ilcSpinner); TODO Need to add a delay
    I.waitInUrl(locators.peopleUrl);
    I.seeAttributesOnElements(locators.goToPeople, {
        'aria-current': 'page',
    });
    I.dontSeeElement(locators.ilcSpinner);
    I.see('No one selected', locators.selectedPerson);
    I.waitForClickable(locators.fetchMorePeople);
    I.seeNumberOfVisibleElements(locators.personsList, 10);

    /**
     * Should show more persons when a user clicks to fetch more them
     */
    I.click(locators.fetchMorePeople);
    I.waitForClickable(locators.fetchMorePeople);
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
