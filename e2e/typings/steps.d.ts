/// <reference types='codeceptjs' />
type peoplePage = typeof import('../spec/pages/people');
type newsPage = typeof import('../spec/pages/news');
type planetsPage = typeof import('../spec/pages/planets');
type hooksPage = typeof import('../spec/pages/hooks');
type common = typeof import('../spec/pages/common');
type MockRequestHelper = import('@codeceptjs/mock-request');
type ChaiWrapper = import('codeceptjs-chai');

declare namespace CodeceptJS {
  interface SupportObject { I: I, current: any, peoplePage: peoplePage, newsPage: newsPage, planetsPage: planetsPage, hooksPage: hooksPage, common: common }
  interface Methods extends Puppeteer, MockRequestHelper, Mochawesome, ChaiWrapper {}
  interface I extends WithTranslation<Methods> {}
  namespace Translation {
    interface Actions {}
  }
}
