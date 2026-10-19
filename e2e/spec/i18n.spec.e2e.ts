Feature('I18n');

Scenario('Renders (SSR) default language', ({ I }) => {
    I.amOnPage('/news/');
    I.see('No SSR', '#navbar .primary-navigation-link');
});

Scenario('Renders (SSR) UA language', ({ I }) => {
    I.amOnPage('/ua/news/');
    I.see('Без SSR', '#navbar .primary-navigation-link');
});

Scenario('Switches language there and backwards', ({ I }) => {
    I.amOnPage('/news/');

    I.click('UA', '#navbar');
    I.waitForText('Без SSR', 10, '#navbar .primary-navigation-link');
    I.waitInUrl('/ua/news/', 10);

    I.click('EN', '#navbar');
    I.waitForText('No SSR', 10, '#navbar .primary-navigation-link');
    I.waitUrlEquals('/news/', 10);
});

Scenario('Performs redirect to previously used lang from default link', ({ I }) => {
    I.amOnPage('/news/');

    I.click('UA', '#navbar');
    I.waitInUrl('/ua/news/', 10);

    I.amOnPage('/news/');
    I.seeInCurrentUrl('/ua/news/');
});
