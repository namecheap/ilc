Feature('news ilc demo application');

Scenario('should open a news page and show news sources', async (I, newsPage) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.goToNews, 30);
    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 30);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 30);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('should open an article page from a direct link', async (I, newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 30);
    I.waitForElement(newsPage.newsSources, 30);
    I.scrollPageToBottom();

    const lastNewsSourceLinkHref = await I.grabAttributeFrom(newsPage.lastNewsSourceLink, 'href');

    I.click(newsPage.lastNewsSourceLink);
    I.waitInUrl(lastNewsSourceLinkHref, 30);
    I.scrollPageToTop();
    I.see('Headlines', newsPage.bannerHeadline);
    I.waitForElement(newsPage.newsSourceArticles, 30);

    const firstNewsSourceArticleHref = await I.grabAttributeFrom(newsPage.firstNewsSourceArticle, 'href');

    I.mockRequest('GET', firstNewsSourceArticleHref, 200, '');
    I.click(newsPage.firstNewsSourceArticle);
    I.switchToNextTab();
    I.waitInUrl(firstNewsSourceArticleHref, 30);
    I.switchToPreviousTab();
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.closeOtherTabs();
});

Scenario('should open 500 error page when an error happens', async (I, newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 30);
    I.waitForElement(newsPage.generateError, 30);
    I.click(newsPage.generateError);
    I.waitForElement(newsPage.errorId, 5);
    I.seeInCurrentUrl(newsPage.newsUrl);
});
