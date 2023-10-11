Feature('news ilc demo application');

Scenario('should open a news page and show news sources', async ({ I, newsPage: newsPage }) => {
    I.amOnPage('/');
    I.waitForElement(newsPage.linkWithUrl(newsPage.url.main), 10);
    I.click(newsPage.linkWithUrl(newsPage.url.main));
    I.waitInUrl(newsPage.url.main, 10);
    I.seeAttributesOnElements(newsPage.linkWithUrl(newsPage.url.main), {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 10);
    I.see('Pick a news source', newsPage.bannerHeadline);
});

Scenario('should open an article page from a direct link', async ({ I, newsPage: newsPage }) => {
    I.amOnPage(newsPage.url.main);
    I.waitInUrl(newsPage.url.main, 10);
    I.waitForElement(newsPage.newsSources, 10);
    I.scrollPageToBottom();

    const lastNewsSourceLinkHref = await I.grabAttributeFrom(newsPage.lastNewsSourceLink, 'href');

    I.click(newsPage.lastNewsSourceLink);
    I.waitInUrl(lastNewsSourceLinkHref, 10);
    I.scrollPageToTop();
    I.see('Headlines', newsPage.bannerHeadline);
    I.waitForElement(newsPage.newsSourceArticles, 10);

    const firstNewsSourceArticleHref = await I.grabAttributeFrom(newsPage.firstNewsSourceArticle, 'href');

    I.click(newsPage.firstNewsSourceArticle);
    I.switchToNextTab();
    I.waitInUrl(firstNewsSourceArticleHref.replace(/https?/, ''), 10);
    I.switchToPreviousTab();
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.closeOtherTabs();
});
