Feature('404');

Scenario('should show 404 error page', (I) => {
    I.amOnPage('/nonexistent-path');
    I.waitForText('404 not found', 5, 'body > div#body');
});
