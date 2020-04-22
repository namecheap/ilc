export const ilcSpinner = 'body > div > div.ilc-spinner';

export const planetsUrl = '/planets';

export const goToPlanets = `body > div#navbar a[href="${planetsUrl}"]`;
export const planetsView = 'body > div#body > div.single-spa-container > div.view';
export const fetchMorePlanets = `${planetsView} > div.left > div.planetList > button.brand-button`;
export const selectedPlanet = `${planetsView} > div.right > div > div.selectedPlanet`;
export const selectedPlanetName = `${selectedPlanet} > div > div:first-child > div.header`;
export const selectedPlanetTabs = `${selectedPlanet} > div > div:last-child > div.tabs`;
export const selectedPlanetTabAttributes = `${selectedPlanetTabs} > a.tabLink:nth-child(1)`;
export const selectedPlanetTabPeople = `${selectedPlanetTabs} > a.tabLink:nth-child(2)`;
export const selectedPlanetTabTodo = `${selectedPlanetTabs} > a.tabLink:nth-child(3)`;
export const planetsList = `${planetsView} > div.left > div.planetList > div`;
export const lastPlanet = `${planetsList}:last-child > a.planet`;

export const peopleUrl = '/people';

export const goToPeople = `body > div#navbar a[href="${peopleUrl}"]`;
export const peopleView = 'body > div#body > div.peoplePage > div.peoplePageContents';
export const lastPerson = `${peopleView} > div.listWrapper > div.peopleList > a.person:last-child`;
export const fetchMorePeople = `${peopleView} > div.listWrapper > button.brand-button`;
export const selectedPerson = `${peopleView} > div.selectedWrapper > div.selectedPerson > div.selectedPerson`;
export const personsList = `${peopleView} > div.listWrapper > div.peopleList > a.person`;

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
