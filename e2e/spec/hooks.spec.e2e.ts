Feature('Hooks');

Scenario('Renders a confirmation dialog when a user tries to go to a protected page', (I, hooksPage: hooksPage) => {
    I.clearCookie();
    I.amOnPage(hooksPage.url.entry);
    I.seeElement(hooksPage.goToProtectedPage);

    I.click(hooksPage.goToProtectedPage);
    I.waitForElement(hooksPage.confirmDialog, 30);
    I.seeInCurrentUrl(hooksPage.url.entry);

    I.click(hooksPage.confirmDialogButtonProceed);
    I.waitInUrl(hooksPage.url.protected, 30);
    I.seeElement(hooksPage.goToEntryPage);

    I.click(hooksPage.goToEntryPage);
    I.waitInUrl(hooksPage.url.entry, 30);
    I.seeElement(hooksPage.goToProtectedPage);

    I.click(hooksPage.goToProtectedPage);
    I.waitInUrl(hooksPage.url.protected, 30);
    I.dontSeeElement(hooksPage.confirmDialog);
});

Scenario('Redirects to home page when a user tries to visit protected page', (I, hooksPage: hooksPage) => {
    I.clearCookie();
    I.amOnPage(hooksPage.url.protected);
    I.waitInUrl('/', 30);
});

Scenario('Renders a confirmation dialog when a user try to navigate by the forward browser button to a protected page', (I, hooksPage: hooksPage) => {
    I.clearCookie();
    I.amOnPage(hooksPage.url.entry);
    I.seeElement(hooksPage.goToProtectedPage);

    I.click(hooksPage.goToProtectedPage);
    I.waitInUrl(hooksPage.url.entry, 30);
    I.seeElement(hooksPage.confirmDialog);

    I.click(hooksPage.confirmDialogButtonProceed);
    I.waitInUrl(hooksPage.url.protected, 30);
    I.seeElement(hooksPage.goToEntryPage);

    I.clearCookie();
    I.executeScript(function() {
        window.history.back();
    });
    I.executeScript(function() {
        window.history.forward();
    });
    I.waitForElement(hooksPage.confirmDialog, 30);
    I.waitInUrl(hooksPage.url.entry, 30);
});

Scenario('Renders a confirmation dialog when a user try to navigate by the help of the back browser button to a protected page', (I, hooksPage: hooksPage) => {
    I.clearCookie();
    I.amOnPage(hooksPage.url.entry);
    I.seeElement(hooksPage.goToProtectedPage);

    I.click(hooksPage.goToProtectedPage);
    I.waitInUrl(hooksPage.url.entry, 30);
    I.seeElement(hooksPage.confirmDialog);

    I.click(hooksPage.confirmDialogButtonProceed);
    I.waitInUrl(hooksPage.url.protected, 30);
    I.seeElement(hooksPage.goToEntryPage);

    I.click(hooksPage.goToEntryPage);
    I.waitInUrl(hooksPage.url.entry, 30);
    I.seeElement(hooksPage.goToProtectedPage);

    I.clearCookie();
    I.executeScript(function() {
        window.history.back();
    });

    I.waitInUrl(hooksPage.url.entry, 30);
    I.seeElement(hooksPage.confirmDialog);
});
