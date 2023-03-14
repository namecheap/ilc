Feature('404 error handling');

//region 404 page for non-existing ILC route
Scenario('Renders (SSR) global 404 page for non-existing ILC route for domain "localhost:8233" (default)', ({I, common: common}) => {
    I.amOnPage('/nonexistent-path');
    I.seeInSource(common.text404NotFound);
});
Scenario('Renders (CSR) global 404 page for non-existing ILC route for domain "localhost:8233" (default)', ({I, peoplePage, common: common}) => {
    const notFoundPageLink = '#navbar a[href="/nosuchpath"]';

    I.amOnPage(peoplePage.peopleUrl);
    I.waitForElement(notFoundPageLink, 30);
    I.click(notFoundPageLink);
    I.seeInSource(common.text404NotFound);
});

Scenario('Renders (SSR) global 404 page for non-existing ILC route for domain "127.0.0.1:8233"', ({I, common: common}) => {
    I.amOnPage(common.url.localhostAsIPv4 + '/nonexistent-path');
    I.seeInSource(common.text404NotFoundForLocalhostAsIPv4);
});
Scenario('Renders (CSR) global 404 page for non-existing ILC route for domain "127.0.0.1:8233"', ({I, peoplePage, common: common}) => {
    const notFoundPageLink = '#navbar a[href="/nosuchpath"]';

    I.amOnPage(common.url.localhostAsIPv4 + peoplePage.peopleUrl);
    I.waitForElement(notFoundPageLink, 30);
    I.click(notFoundPageLink);
    I.seeInSource(common.text404NotFoundForLocalhostAsIPv4);
});
//endregion 404 page for non-existing ILC route

//region 404 page for non-existing News app route
Scenario('Renders (SSR) global 404 page for non-existing News app route', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.nonExistingRoute);
    I.seeInSource(common.text404NotFound);
});

Scenario('Renders (CSR) global 404 page for non-existing News app route', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingRoute), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingRoute));
    I.seeInSource(common.text404NotFound);

    //After 404 page ILC continues normal operation
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('Renders (SSR) overridden 404 page for non-existing News app route', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.nonExistingRouteWithOverride);
    I.seeInSource(common.text404NotFoundVue);
});

Scenario('Renders (CSR) overridden 404 page for non-existing News app route', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingRouteWithOverride), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingRouteWithOverride));
    I.seeInSource(common.text404NotFoundVue);
});
//endregion 404 page for non-existing News app route

//region 404 page for non-existing News resource
Scenario.skip('Renders (SSR) global 404 page for non-existing News resource', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.nonExistingResource);
    I.seeInSource(common.text404NotFound);
});

Scenario.skip('Renders (CSR) global 404 page for non-existing News resource', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingResource), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingResource));
    I.seeInSource(common.text404NotFound);

    //After 404 page ILC continues normal operation
    I.wait(5); //Hack to fix issue with the Vue Router
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario.skip('Renders (SSR) overridden 404 page for non-existing News resource', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.nonExistingResourceWithOverride);
    I.seeInSource(common.text404NotFoundVue);
});

Scenario.skip('Renders (CSR) overridden 404 page for non-existing News resource', ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.nonExistingResourceWithOverride), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.nonExistingResourceWithOverride));
    I.seeInSource(common.text404NotFoundVue);
});
//endregion 404 page for non-existing News resource
