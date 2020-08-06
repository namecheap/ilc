Feature('404 error handling');

//region 404 page for non-existing ILC route
Scenario('Renders (SSR) global 404 page for non-existing ILC route', (I) => {
    I.amOnPage('/nonexistent-path');
    I.waitForText('404 not found', 10, 'body > div#body');
});
Scenario('Renders (CSR) global 404 page for non-existing ILC route', (I, peoplePage) => {
    const notFoundPageLink = '#navbar a[href="/nosuchpath"]';

    I.amOnPage(peoplePage.peopleUrl);
    I.waitForElement(notFoundPageLink, 30);
    I.click(notFoundPageLink);
    I.waitForText('404 not found', 10, 'body > div#body');
});
//endregion 404 page for non-existing ILC route

//region 404 page for non-existing News app route
Scenario('Renders (SSR) global 404 page for non-existing News app route', (I) => {
    I.amOnPage('/news/nonExisting');
    I.waitForText('404 not found', 10, 'body > div#body');
});

Scenario('Renders (CSR) global 404 page for non-existing News app route', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.goToNonExistingRoute, 10);
    I.click(newsPage.goToNonExistingRoute);
    I.waitForText('404 not found', 10, 'body > div#body');

    //After 404 page ILC continues normal operation
    I.click(newsPage.goToNews);
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('Renders (SSR) overridden 404 page for non-existing News app route', (I, newsPage: newsPage) => {
    I.amOnPage('/news/nonExisting?overrideErrorPage=1');
    I.waitForText('404 not found component', 10, 'body > div#body');
});

Scenario('Renders (CSR) overridden 404 page for non-existing News app route', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.goToNonExistingRouteOverride, 10);
    I.click(newsPage.goToNonExistingRouteOverride);
    I.waitForText('404 not found component', 10, 'body > div#body');
});
//endregion 404 page for non-existing News app route

//region 404 page for non-existing News resource
Scenario('Renders (SSR) global 404 page for non-existing News resource', (I) => {
    I.amOnPage('/news/article/abc-news-au34');
    I.waitForText('404 not found', 10, 'body > div#body');
});

Scenario('Renders (CSR) global 404 page for non-existing News resource', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.goToNonExistingResource, 10);
    I.click(newsPage.goToNonExistingResource);
    I.waitForText('404 not found', 10, 'body > div#body');

    //After 404 page ILC continues normal operation
    I.wait(5); //Hack to fix issue with the Vue Router
    I.click(newsPage.goToNews);
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('Renders (SSR) overridden 404 page for non-existing News resource', (I, newsPage: newsPage) => {
    I.amOnPage('/news/article/abc-news-au34?overrideErrorPage=1');
    I.waitForText('404 not found component', 1000, 'body > div#body');
});

Scenario('Renders (CSR) overridden 404 page for non-existing News resource', (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.goToNonExistingResourceOverride, 10);
    I.click(newsPage.goToNonExistingResourceOverride);
    I.waitForText('404 not found component', 10, 'body > div#body');
});
//endregion 404 page for non-existing News resource
