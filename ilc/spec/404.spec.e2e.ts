Feature('404');

Before((I) => {
    I.amOnPage('/');
});

Scenario('a user tries to interact with a nonexistent page', (I) => {
    I.waitInUrl('/', 5);
    I.amOnPage('/nonexistent-path');
    I.waitForText('404 not found', 5, 'body > div#body');
});
