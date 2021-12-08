Feature('Home page');

Scenario('Renders home page', ({I}) => {
    I.amOnPage('/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');
});
