const { I } = inject();

const firstPlanetsPageData = require('./data/planets.page.01.json');
const secondPlanetsPageData = require('./data/planets.page.02.json');

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

export const mockFirstPlanetsPage = () => I.mockRequest(
    'GET',
    'https://swapi-v2.herokuapp.com/api/planets/?page=1',
    200,
    firstPlanetsPageData,
);

export const mockSecondPlanetsPage = () => I.mockRequest(
    'GET',
    'https://swapi-v2.herokuapp.com/api/planets/?page=2',
    200,
    secondPlanetsPageData,
);
