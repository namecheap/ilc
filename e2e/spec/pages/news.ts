const { I } = inject();

export const url = {
    main: '/news/',
    nonExistingRoute: '/news/nonExisting',
    nonExistingRouteWithOverride: '/news/nonExisting?overrideErrorPage=1',
    nonExistingResource: '/news/article/abc-news-au34',
    nonExistingResourceWithOverride: '/news/article/abc-news-au34?overrideErrorPage=1',
};

export const linkWithUrl = (url:string) => `a[href="${url}"]`;

export const newsView = 'body > div#body > div.single-spa-container.news-app > div.view';
export const newsSources = `${newsView} > div.sources > div.container > ol > li.source`;
export const bannerHeadline = `${newsView} > div.banner > h1`;
export const generateError = `${newsView} > div.banner > a`;
export const lastNewsSource = `${newsSources}:last-child`;
export const lastNewsSourceLink = `${lastNewsSource} > p.action > a`;
export const newsSourceArticles = `${newsView} > div.container > div.articles > ol > li.article`;
export const firstNewsSourceArticle = `${newsSourceArticles}:first-child > div.meta > div.redirect > a`;
