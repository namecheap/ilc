const { I } = inject();

export const newsUrl = '/news/';

export const goToNews = `body > div#navbar a[href="${newsUrl}"]`;
export const newsView = 'body > div#body > div.single-spa-container > div.view';
export const goToNewsSources = `${newsView} > div.container > p.home > a[href="${newsUrl}"]`;
export const newsSources = `${newsView} > div.sources`;
export const bannerHeadline = `${newsView} > div.banner > h1`;
export const generateError = `${newsView} > div.banner > a`;
export const lastNewsSource = `${newsView} > div.sources > div.container > ol > li.source:last-child`;
export const lastNewsSourceLink = `${lastNewsSource} > p.action > a`;
export const newsSourceArticles = `${newsView} > div.container > div.articles > ol > li.article`;
export const firstNewsSourceArticle = `${newsView} > div.container > div.articles > ol > li.article:first-child > div.meta > div.redirect > a`;

export const ilcSpinner = 'body > div > div.ilc-spinner';
