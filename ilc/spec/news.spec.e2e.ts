Feature('news ilc demo application');

Scenario('should open a news page and show news sources', async (I, newsPage: newsPage) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.goToNews, 10);
    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('should open an article page from a direct link', async (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.newsSources, 10);
    I.scrollPageToBottom();

    const lastNewsSourceLinkHref = await I.grabAttributeFrom(newsPage.lastNewsSourceLink, 'href');

    I.click(newsPage.lastNewsSourceLink);
    I.waitInUrl(lastNewsSourceLinkHref, 10);
    I.scrollPageToTop();
    I.see('Headlines', newsPage.bannerHeadline);
    I.waitForElement(newsPage.newsSourceArticles, 10);

    const firstNewsSourceArticleHref = await I.grabAttributeFrom(newsPage.firstNewsSourceArticle, 'href');

    I.mockRequest('GET', firstNewsSourceArticleHref, 200, '');
    I.click(newsPage.firstNewsSourceArticle);
    I.switchToNextTab();
    I.waitInUrl(firstNewsSourceArticleHref, 10);
    I.switchToPreviousTab();
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.closeOtherTabs();
});

Scenario('should open 500 error page when an error happens', async (I, newsPage: newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 10);
    I.waitForElement(newsPage.generateError, 10);
    I.click(newsPage.generateError);
    I.waitForElement(newsPage.errorId);
    I.seeInCurrentUrl(newsPage.newsUrl);
});
