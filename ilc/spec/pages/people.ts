const { I } = inject();

const firstPeoplePageData = require('./data/people.page.01.json');
const secondPeoplePageData = require('./data/people.page.02.json');

export const peopleUrl = '/people';

export const goToPeople = `body > div#navbar a[href="${peopleUrl}"]`;
export const peopleView = 'body > div#body > div.peoplePage > div.peoplePageContents';
export const lastPerson = `${peopleView} > div.listWrapper > div.peopleList > a.person:last-child`;
export const fetchMorePeople = `${peopleView} > div.listWrapper > button.brand-button`;
export const selectedPerson = `${peopleView} > div.selectedWrapper > div.selectedPerson > div.selectedPerson`;
export const personsList = `${peopleView} > div.listWrapper > div.peopleList > a.person`;

export const mockFirstPeoplePage = () => I.mockRequest(
    'GET',
    'https://swapi-v2.herokuapp.com/api/people/?page=1',
    200,
    firstPeoplePageData,
);

export const mockSecondPeoplePage = () => I.mockRequest(
    'GET',
    'https://swapi-v2.herokuapp.com/api/people/?page=2',
    200,
    secondPeoplePageData,
);
