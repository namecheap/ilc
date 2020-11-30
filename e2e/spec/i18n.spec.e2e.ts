Feature('I18n');

Scenario('Renders (SSR) default language', (I) => {
    I.amOnPage('/news/');
    I.see('People', '#navbar .primary-navigation-link');
});

Scenario('Renders (SSR) UA language', (I) => {
    I.amOnPage('/ua/news/');
    I.see('Люди', '#navbar .primary-navigation-link');
});

Scenario('Switches language there and backwards', (I) => {
    I.amOnPage('/news/');

    I.click('UA', '#navbar');
    I.see('Люди', '#navbar .primary-navigation-link');
    I.seeInCurrentUrl('/ua/news/');

    I.click('EN', '#navbar');
    I.see('People', '#navbar .primary-navigation-link');
    I.seeInCurrentUrl('/news/');
});

Scenario('Performs redirect to previously used lang from default link', (I) => {
    I.amOnPage('/news/');

    I.click('UA', '#navbar');
    I.seeInCurrentUrl('/ua/news/');

    I.amOnPage('/news/');
    I.seeInCurrentUrl('/ua/news/');
});
