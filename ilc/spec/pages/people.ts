const { I } = inject();

export const peopleUrl = '/people';

export const goToPeople = `body > div#navbar a[href="${peopleUrl}"]`;
export const peopleView = 'body > div#body > div.peoplePage > div.peoplePageContents';
export const lastPerson = `${peopleView} > div.listWrapper > div.peopleList > a.person:last-child`;
export const fetchMorePeople = `${peopleView} > div.listWrapper > button.brand-button`;
export const selectedPerson = `${peopleView} > div.selectedWrapper > div.selectedPerson > div.selectedPerson`;
export const personsList = `${peopleView} > div.listWrapper > div.peopleList > a.person`;

export const ilcSpinner = 'body > div > div.ilc-spinner';
