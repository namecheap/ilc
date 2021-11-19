const { I } = inject();

export const peopleUrl = '/people';

export const goToPeople = `body > div#navbar a[href="${peopleUrl}"]`;
export const peopleView = 'body > div#body > div[class^="peoplePage"] > div[class^="peoplePageContents"]';
export const lastPerson = `${peopleView} > div[class^="listWrapper"] > div.peopleList > a[class^="person"]:last-child`;
export const fetchMorePeople = `${peopleView} > div[class^="listWrapper"] > button.brand-button`;
export const selectedPerson = `${peopleView} > div[class^="selectedWrapper"] > div.selectedPerson > div.selectedPerson`;
export const personsList = `${peopleView} > div[class^="listWrapper"] > div.peopleList > a[class^="person"]`;