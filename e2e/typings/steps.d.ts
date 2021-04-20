/// <reference types='codeceptjs' />
type peoplePage = typeof import('../spec/pages/people');
type newsPage = typeof import('../spec/pages/news');
type planetsPage = typeof import('../spec/pages/planets');
type hooksPage = typeof import('../spec/pages/hooks');
type common = typeof import('../spec/pages/common');
type MockRequestHelper = import('@codeceptjs/mock-request');

declare namespace CodeceptJS {
  interface SupportObject { I: CodeceptJS.I, peoplePage: peoplePage, newsPage: newsPage, planetsPage: planetsPage, hooksPage: hooksPage, common: common }
  interface CallbackOrder { [0]: CodeceptJS.I; [1]: peoplePage; [2]: newsPage; [3]: planetsPage; [4]: hooksPage; [5]: common }
  interface Methods extends CodeceptJS.Puppeteer, MockRequestHelper {}
  interface I extends WithTranslation<Methods> {}
  namespace Translation {
    interface Actions {}
  }
}
