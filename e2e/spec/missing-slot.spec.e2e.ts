import { ConsoleMessage } from 'puppeteer';

Feature('Missing slot in template');

const testPageUrl = '/missing-slot-in-tpl/';

Scenario('(SSR) should correctly open page where app requires missing slot in template', async ({I, peoplePage}) => {
    I.amOnPage(testPageUrl);

    const consoleMessages: ConsoleMessage[] = await I.grabBrowserLogs();
    I.assertContain(consoleMessages.map(v => v.text()), 'Failed to activate application "@portal/system" due to absence of requested slot "invalid-slot" in template.');

    // Navbar was rendered correctly
    I.waitForElement(peoplePage.goToPeople, 10);

    // Checking that navigation still works
    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 10);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 10);
});

Scenario('(CSR) should correctly open page where app requires missing slot in template', async ({I, peoplePage}) => {
    I.amOnPage('/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');

    I.executeScript(`window.history.pushState(null, {}, '${testPageUrl}');`);
    I.waitInUrl(testPageUrl, 10);

    const consoleMessages: ConsoleMessage[] = await I.grabBrowserLogs();
    I.assertContain(consoleMessages.map(v => v.text()), 'Failed to activate application "@portal/system" due to absence of requested slot "invalid-slot" in template.');

    // Navbar was rendered correctly
    I.waitForElement(peoplePage.goToPeople, 10);

    // Checking that navigation still works
    I.click(peoplePage.goToPeople);
    I.waitInUrl(peoplePage.peopleUrl, 10);
    I.seeAttributesOnElements(peoplePage.goToPeople, {
        'aria-current': 'page',
    });
    I.see('No one selected', peoplePage.selectedPerson);
    I.waitForClickable(peoplePage.fetchMorePeople, 10);
});
