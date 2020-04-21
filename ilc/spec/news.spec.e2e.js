const locators = require('./locators.e2e');

Feature('news ilc demo application');

Before((I) => {
  I.amOnPage('/');
});

Scenario('a user tries to interact with a news page', async (I) => {
  I.click(locators.goToNews);
  I.waitInUrl(locators.newsUrl);
  I.seeAttributesOnElements(locators.goToNews, {
    'aria-current': 'page',
  });
  I.waitForElement(locators.newsSources, 5);
  I.see('Pick a news source', locators.bannerHeadline);

  I.scrollPageToBottom();

  const lastNewsSourceLinkHref = await I.grabAttributeFrom(locators.lastNewsSourceLink, 'href');

  I.click(locators.lastNewsSourceLink);
  I.seeInCurrentUrl(lastNewsSourceLinkHref);
  I.scrollPageToTop();
  I.waitNumberOfVisibleElements(locators.newsSourceArticles, 10);

  /**
   * Should open a new page from a direct link which ILC does not handle
   */
  const firstNewsSourceArticleHref = await I.grabAttributeFrom(locators.firstNewsSourceArticle, 'href');

  I.click(locators.firstNewsSourceArticle);
  I.switchToNextTab();
  I.seeInCurrentUrl(firstNewsSourceArticleHref);
  I.switchToPreviousTab();
  I.seeInCurrentUrl(lastNewsSourceLinkHref);
  I.closeOtherTabs();

  I.click(locators.goToNewsSources);
  I.waitInUrl(locators.newsUrl);
  I.waitForElement(locators.newsSources, 5);
  I.see('Pick a news source', locators.bannerHeadline);

  /**
   * Should handle an application error by ILC
   */
  I.click(locators.generateError);
  I.waitForText('Error ID', 5);
  I.seeInCurrentUrl(locators.newsUrl);
});