Feature('404');

Before((I) => {
    I.amOnPage('/');
});

Scenario('a user tries to interact with a nonexistent page', (I) => {
    I.waitInUrl('/');
    I.amOnPage('/nonexistent-path');
    I.see('404 not found', 'body > div#body');
});