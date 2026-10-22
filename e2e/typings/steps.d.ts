/// <reference types='codeceptjs' />
type peoplePage = typeof import('../spec/pages/people');
type newsPage = typeof import('../spec/pages/news');
type planetsPage = typeof import('../spec/pages/planets');
type hooksPage = typeof import('../spec/pages/hooks');
type common = typeof import('../spec/pages/common');
type registryPage = typeof import('../spec/pages/registry');
type ChaiWrapper = import('codeceptjs-chai');
type RegistryApi = InstanceType<typeof import('../spec/helpers/RegistryApi').default>;

declare namespace CodeceptJS {
    interface SupportObject {
        I: I;
        current: any;
        peoplePage: peoplePage;
        newsPage: newsPage;
        planetsPage: planetsPage;
        hooksPage: hooksPage;
        common: common;
        registryPage: registryPage;
        login: (name: 'registryAdmin' | 'registryReadonly') => Promise<void>;
    }
    interface Methods extends Puppeteer, ChaiWrapper, RegistryApi {}
    interface I extends WithTranslation<Methods> {}
    namespace Translation {
        interface Actions {}
    }
}
