Feature('news ilc demo application');

Before((I) => {
    I.startMocking();
    I.mockServer((server) => {
        server.get('https://newsapi.org/v1/sources').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/news.sources.json'));
        });

        server.get('https://newsapi.org/v1/articles?source=wirtschafts-woche&apiKey=97c568e8528f40be944a8c047aef2210').intercept((req: any, res: any) => {
            res.status(200).json(require('./data/news.source.articles.json'));
        });

        server.get('https://www.wiwo.de/unternehmen/auto/wandel-kostet-milliarden-suv-und-china-sollen-audi-wieder-nach-vorne-bringen/21069566.html').intercept((req: any, res: any) => {
            res.status(200).send();
        });
    });

    I.amOnPage('/');
});

After((I) => {
    I.stopMocking();
});

Scenario('a user tries to interact with a news page', async (I, newsPage) => {
    I.waitInUrl('/', 5);
    I.click(newsPage.goToNews);
    I.waitInUrl(newsPage.newsUrl, 5);
    I.seeAttributesOnElements(newsPage.goToNews, {
        'aria-current': 'page',
    });
    I.waitForElement(newsPage.newsSources, 5);
    I.see('Pick a news source', newsPage.bannerHeadline);

    I.scrollPageToBottom();

    const lastNewsSourceLinkHref = await I.grabAttributeFrom(newsPage.lastNewsSourceLink, 'href');

    I.click(newsPage.lastNewsSourceLink);
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.scrollPageToTop();
    I.waitNumberOfVisibleElements(newsPage.newsSourceArticles, 10, 5);

    /**
     * Should open a new page from a direct link which ILC does not handle
     */
    const firstNewsSourceArticleHref = await I.grabAttributeFrom(newsPage.firstNewsSourceArticle, 'href');

    I.click(newsPage.firstNewsSourceArticle);
    I.switchToNextTab();
    I.seeInCurrentUrl(firstNewsSourceArticleHref);
    I.switchToPreviousTab();
    I.seeInCurrentUrl(lastNewsSourceLinkHref);
    I.closeOtherTabs();

    I.click(newsPage.goToNewsSources);
    I.waitInUrl(newsPage.newsUrl, 5);
    I.waitForElement(newsPage.newsSources, 5);
    I.see('Pick a news source', newsPage.bannerHeadline);

    /**
     * Should handle an application error by ILC
     */
    I.click(newsPage.generateError);
    I.waitForText('Error ID', 5);
    I.seeInCurrentUrl(newsPage.newsUrl);
});
