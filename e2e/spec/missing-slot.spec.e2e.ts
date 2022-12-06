import { ConsoleMessage } from 'puppeteer';

Feature('Missing slot in template');

const testPageUrl = '/missing-slot-in-tpl/';

Scenario('(SSR) should correctly open page where app requires missing slot in template', async ({I, peoplePage}) => {
    I.amOnPage(testPageUrl);

    const consoleMessages: ConsoleMessage[] = await I.grabBrowserLogs();
    const messagesText = consoleMessages.map(v => v.text());

    I.assertContain(messagesText, `Looks like we're missing slot "invalid-slot" in template... Ignoring possible config overrides...`);

    const notMountedErrExists = messagesText.some(v => v.includes(`NOT_MOUNTED: Failed to mount application \\"@portal/system\\" to slot \\"invalid-slot\\" due to absence of the slot in template`));
    I.assertTrue(notMountedErrExists, 'Contains NOT_MOUNTED error');

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
    const messagesText = consoleMessages.map(v => v.text());

    const notMountedErrExists = messagesText.some(v => v.includes(`NOT_MOUNTED: Failed to mount application \\"@portal/system\\" to slot \\"invalid-slot\\" due to absence of the slot in template`));
    I.assertTrue(notMountedErrExists, 'Contains NOT_MOUNTED error');

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
