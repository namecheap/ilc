const ilcSpinner = 'body > div > div.ilc-spinner';

const planetsUrl = '/planets';

const goToPlanets = `body > div#navbar a[href="${planetsUrl}"]`;
const planetsView = 'body > div#body > div.single-spa-container > div.view';
const fetchMorePlanets = `${planetsView} > div.left > div.planetList > button.brand-button`;
const selectedPlanet = `${planetsView} > div.right > div > div.selectedPlanet`;
const selectedPlanetName = `${selectedPlanet} > div > div:first-child > div.header`;
const selectedPlanetTabs = `${selectedPlanet} > div > div:last-child > div.tabs`;
const selectedPlanetTabAttributes = `${selectedPlanetTabs} > a.tabLink:nth-child(1)`;
const selectedPlanetTabPeople = `${selectedPlanetTabs} > a.tabLink:nth-child(2)`;
const selectedPlanetTabTodo = `${selectedPlanetTabs} > a.tabLink:nth-child(3)`;
const planetsList = `${planetsView} > div.left > div.planetList > div`;
const lastPlanet = `${planetsList}:last-child > a.planet`;

const peopleUrl = '/people';

const goToPeople = `body > div#navbar a[href="${peopleUrl}"]`;
const peopleView = 'body > div#body > div.peoplePage > div.peoplePageContents';
const lastPerson = `${peopleView} > div.listWrapper > div.peopleList > a.person:last-child`;
const fetchMorePeople = `${peopleView} > div.listWrapper > button.brand-button`;
const selectedPerson = `${peopleView} > div.selectedWrapper > div.selectedPerson > div.selectedPerson`;
const personsList = `${peopleView} > div.listWrapper > div.peopleList > a.person`;

const newsUrl = '/news/';

const goToNews = `body > div#navbar a[href="${newsUrl}"]`;
const newsView = 'body > div#body > div.single-spa-container > div.view';
const goToNewsSources = `${newsView} > div.container > p.home > a[href="${newsUrl}"]`;
const newsSources = `${newsView} > div.sources`;
const bannerHeadline = `${newsView} > div.banner > h1`;
const generateError = `${newsView} > div.banner > a`;
const lastNewsSource = `${newsView} > div.sources > div.container > ol > li.source:last-child`;
const lastNewsSourceLink = `${lastNewsSource} > p.action > a`;
const newsSourceArticles = `${newsView} > div.container > div.articles > ol > li.article`;
const firstNewsSourceArticle = `${newsView} > div.container > div.articles > ol > li.article:first-child > div.meta > div.redirect > a`;

module.exports = {
    ilcSpinner,
    planetsUrl,
    goToPlanets,
    planetsView,
    fetchMorePlanets,
    selectedPlanet,
    selectedPlanetName,
    selectedPlanetTabs,
    selectedPlanetTabAttributes,
    selectedPlanetTabPeople,
    selectedPlanetTabTodo,
    planetsList,
    lastPlanet,
    peopleUrl,
    goToPeople,
    peopleView,
    lastPerson,
    fetchMorePeople,
    selectedPerson,
    personsList,
    newsUrl,
    goToNews,
    goToNewsSources,
    newsSources,
    bannerHeadline,
    generateError,
    lastNewsSource,
    lastNewsSourceLink,
    newsSourceArticles,
    firstNewsSourceArticle,
};