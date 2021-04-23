const { I } = inject();

export const planetsUrl = '/planets';

export const goToPlanets = `body > div#navbar a[href="${planetsUrl}"]`;
export const planetsView = 'body > div#body > div.single-spa-container > div.view';
export const fetchMorePlanets = `${planetsView} > div.left > div.planetList > button.brand-button`;
export const selectedPlanet = `${planetsView} > div.right > div > div.selectedPlanet`;
export const selectedPlanetName = `${selectedPlanet} > div > div:first-child > div > div.header`;
export const selectedPlanetTabs = `${selectedPlanet} > div > div:last-child > div.tabs`;
export const selectedPlanetTabAttributes = `${selectedPlanetTabs} > a.tabLink:nth-child(1)`;
export const selectedPlanetTabPeople = `${selectedPlanetTabs} > a.tabLink:nth-child(2)`;
export const planetsList = `${planetsView} > div.left > div.planetList > div`;
export const lastPlanet = `${planetsList}:last-child > a.planet`;
