Feature('news ilc demo application');

Scenario('should open a news page and show news sources', async (I, newsPage) => {
    newsPage.mockNewsSources();

    I.amOnPage('/');
    I.waitForElement(newsPage.goToNews, 5);
    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 5);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitNumberOfVisibleElements(newsPage.newsSources, 5);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('should open an article page from a direct link', async (I, newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 5);
    I.waitForElement(newsPage.newsSources, 5);
    I.scrollPageToBottom();
    
    const lastNewsSourceLinkHref = await I.grabAttributeFrom(newsPage.lastNewsSourceLink, 'href');

    I.click(newsPage.lastNewsSourceLink);
    I.waitInUrl(lastNewsSourceLinkHref);
    I.scrollPageToTop();
    I.see('Headlines', newsPage.bannerHeadline);
    I.waitForElement(newsPage.newsSourceArticles, 5);

    const firstNewsSourceArticleHref = await I.grabAttributeFrom(newsPage.firstNewsSourceArticle, 'href');

    I.mockRequest('GET', firstNewsSourceArticleHref, 200, '');
    I.click(newsPage.firstNewsSourceArticle);
    I.switchToNextTab();
    I.seeInCurrentUrl(firstNewsSourceArticleHref);
    I.switchToPreviousTab();
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.closeOtherTabs();
});

Scenario('should open 500 error page when an error happens', async (I, newsPage) => {
    I.amOnPage(newsPage.newsUrl);
    I.waitInUrl(newsPage.newsUrl, 5);
    I.waitForElement(newsPage.generateError, 5);
    I.click(newsPage.generateError);
    I.waitForElement(newsPage.errorId, 5);
    I.seeInCurrentUrl(newsPage.newsUrl);
});
