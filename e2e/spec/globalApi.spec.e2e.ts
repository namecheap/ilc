Feature('Global API');

Scenario('navigate() w/o locale', ({I}) => {
    I.amOnPage('/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');

    I.executeScript('window.ILC.navigate("/news");');

    I.seeInCurrentUrl('http://localhost:8233/news');
});

Scenario('navigate() with locale', ({I}) => {
    I.amOnPage('/ua/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');

    I.executeScript('window.ILC.navigate("/news");');

    I.seeInCurrentUrl('http://localhost:8233/ua/news');
});
