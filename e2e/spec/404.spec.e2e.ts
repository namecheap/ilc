Feature('404 error handling');

//region 404 page for non-existing ILC route
Scenario('Renders (SSR) global 404 page for non-existing ILC route for domain "localhost:8233" (default)', (I, common: common) => {
    I.amOnPage('/nonexistent-path');
    I.waitForElement('body > div#navbar > div.app-container > div.navbar-app', 30);
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});
Scenario('Renders (CSR) global 404 page for non-existing ILC route for domain "localhost:8233" (default)', (I, peoplePage, common: common) => {
    const notFoundPageLink = '#navbar a[href="/nosuchpath"]';

    I.amOnPage(peoplePage.peopleUrl);
    I.waitForElement(notFoundPageLink, 30);
    I.click(notFoundPageLink);
    I.waitForElement('body > div#navbar > div.app-container > div.navbar-app', 30);
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});

Scenario('Renders (SSR) global 404 page for non-existing ILC route for domain "127.0.0.1:8233"', (I, common: common) => {
    I.amOnPage(common.url.localhostAsIPv4 + '/nonexistent-path');
    I.waitForText(common.text404NotFound, 10, 'body > div#navbar'); // for "127.0.0.1:8233" inside of navbar will be rendered 404 fragment, like in body
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});
Scenario('Renders (CSR) global 404 page for non-existing ILC route for domain "127.0.0.1:8233"', (I, peoplePage, common: common) => {
    const notFoundPageLink = '#navbar a[href="/nosuchpath"]';

    I.amOnPage(common.url.localhostAsIPv4 + peoplePage.peopleUrl);
    I.waitForElement(notFoundPageLink, 30);
    I.click(notFoundPageLink);
    I.waitForText(common.text404NotFound, 10, 'body > div#navbar'); // for "127.0.0.1:8233" inside of navbar will be rendered 404 fragment, like in body
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});
//endregion 404 page for non-existing ILC route

//region 404 page for non-existing News app route
Scenario('Renders (SSR) global 404 page for non-existing News app route', (I, newsPage: newsPage, common: common) => {
    I.amOnPage(newsPage.url.nonExistingRoute);
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});

Scenario('Renders (CSR) global 404 page for non-existing News app route', (I, newsPage: newsPage, common: common) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingRoute), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingRoute));
    I.waitForText(common.text404NotFound, 10, 'body > div#body');

    //After 404 page ILC continues normal operation
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('Renders (SSR) overridden 404 page for non-existing News app route', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.url.nonExistingRouteWithOverride);
    I.waitForText('404 not found component', 10, 'body > div#body');
});

Scenario('Renders (CSR) overridden 404 page for non-existing News app route', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingRouteWithOverride), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingRouteWithOverride));
    I.waitForText('404 not found component', 10, 'body > div#body');
});
//endregion 404 page for non-existing News app route

//region 404 page for non-existing News resource
Scenario('Renders (SSR) global 404 page for non-existing News resource', (I, newsPage: newsPage, common: common) => {
    I.amOnPage(newsPage.url.nonExistingResource);
    I.waitForText(common.text404NotFound, 10, 'body > div#body');
});

Scenario('Renders (CSR) global 404 page for non-existing News resource', (I, newsPage: newsPage, common: common) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingResource), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingResource));
    I.waitForText(common.text404NotFound, 10, 'body > div#body');

    //After 404 page ILC continues normal operation
    I.wait(5); //Hack to fix issue with the Vue Router
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('Renders (SSR) overridden 404 page for non-existing News resource', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.url.nonExistingResourceWithOverride);
    I.waitForText('404 not found component', 10, 'body > div#body');
});

Scenario('Renders (CSR) overridden 404 page for non-existing News resource', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingResourceWithOverride), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingResourceWithOverride));
    I.waitForText('404 not found component', 10, 'body > div#body');
});
//endregion 404 page for non-existing News resource
