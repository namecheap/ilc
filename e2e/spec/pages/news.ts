const { I } = inject();

export const newsUrl = '/news/';

export const goToNews = `body > div#navbar a[href="${newsUrl}"]`;
export const newsView = 'body > div#body > div.single-spa-container.news-app > div.view';
export const goToNewsSources = `${newsView} > div.container > p.home > a[href="${newsUrl}"]`;
export const newsSources = `${newsView} > div.sources > div.container > ol > li.source`;
export const bannerHeadline = `${newsView} > div.banner > h1`;
export const generateError = `${newsView} > div.banner > a`;
export const errorId = `body > div#error > p:nth-child(3)`;
export const lastNewsSource = `${newsSources}:last-child`;
export const lastNewsSourceLink = `${lastNewsSource} > p.action > a`;
export const newsSourceArticles = `${newsView} > div.container > div.articles > ol > li.article`;
export const firstNewsSourceArticle = `${newsSourceArticles}:first-child > div.meta > div.redirect > a`;
export const goToNonExistingRoute = `${newsView} a[href="/news/nonExisting"]`;
export const goToNonExistingRouteOverride = `${newsView} a[href="/news/nonExisting?overrideErrorPage=1"]`;
export const goToNonExistingResource = `${newsView} a[href="/news/article/abc-news-au34"]`;
export const goToNonExistingResourceOverride = `${newsView} a[href="/news/article/abc-news-au34?overrideErrorPage=1"]`;
