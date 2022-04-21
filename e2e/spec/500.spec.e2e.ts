Feature('500 error handling');

//region 500 page
Scenario('Renders 500 page for domain "localhost:8233" (default)', ({I, common: common}) => {
    I.amOnPage(common.url.urlInternalServerError);
    I.seeInSource(common.textError500);
    I.seeInSource(common.textErrorId);
    I.dontSeeInSource(common.textError500ForLocalhostAsIPv4);
    I.seeInCurrentUrl(common.url.urlInternalServerError);
});
Scenario('should open 500 error page when an error happens for domain "localhost:8233" (default)', async ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 20);
    I.waitForElement(newsPage.generateError, 20);
    I.click(newsPage.generateError);
    I.seeInSource(common.textError500);
    I.seeInSource(common.textErrorId);
    I.dontSeeInSource(common.textError500ForLocalhostAsIPv4);
    I.seeInCurrentUrl(newsPage.url.main);
});

Scenario('Renders 500 page for domain "127.0.0.1:8233"', ({I, common: common}) => {
    I.amOnPage(common.url.localhostAsIPv4 + common.url.urlInternalServerError);
    I.seeInSource(common.textError500ForLocalhostAsIPv4);
    I.seeInSource(common.textErrorId);
    I.dontSeeInSource(common.textError500);
    I.seeInCurrentUrl(common.url.localhostAsIPv4 + common.url.urlInternalServerError);
});
Scenario('should open 500 error page when an error happens for domain "127.0.0.1:8233"', async ({I, newsPage: newsPage, common: common}) => {
    I.amOnPage(common.url.localhostAsIPv4 + newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 20);
    I.waitForElement(newsPage.generateError, 20);
    I.click(newsPage.generateError);
    I.seeInSource(common.textError500ForLocalhostAsIPv4);
    I.seeInSource(common.textErrorId);
    I.dontSeeInSource(common.textError500);
    I.seeInCurrentUrl(common.url.localhostAsIPv4 + newsPage.url.main);
});
//endregion 500 page
