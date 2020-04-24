/// <reference types='codeceptjs' />
type peoplePage = typeof import('/Users/vladlenfedosov/www/rnd/spa_fragments/single-spa-portal-example/ilc/spec/pages/people');
type newsPage = typeof import('/Users/vladlenfedosov/www/rnd/spa_fragments/single-spa-portal-example/ilc/spec/pages/news');
type planetsPage = typeof import('/Users/vladlenfedosov/www/rnd/spa_fragments/single-spa-portal-example/ilc/spec/pages/planets');
type MockRequestHelper = import('@codeceptjs/mock-request');

declare namespace CodeceptJS {
  interface SupportObject { I: CodeceptJS.I, peoplePage: peoplePage, newsPage: newsPage, planetsPage: planetsPage }
  interface CallbackOrder { [0]: CodeceptJS.I; [1]: peoplePage; [2]: newsPage; [3]: planetsPage }
  interface Methods extends CodeceptJS.Puppeteer, MockRequestHelper {}
  interface I extends WithTranslation<Methods> {}
  namespace Translation {
    interface Actions {}
  }
}
