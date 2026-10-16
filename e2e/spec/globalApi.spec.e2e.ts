Feature('Global API');

Scenario('navigate() w/o locale', ({ I }) => {
    I.amOnPage('/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');

    I.executeScript('window.ILC.navigate("/news");');

    I.waitInUrl('/news', 10);
});

Scenario('navigate() with locale', ({ I }) => {
    I.amOnPage('/ua/');
    I.waitForText('Hi! Welcome to our Demo website', 10, '#body');

    I.executeScript('window.ILC.navigate("/news");');

    I.waitInUrl('/ua/news', 10);
});
