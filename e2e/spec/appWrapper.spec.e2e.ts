Feature('App Wrapper');

Scenario('Renders App Wrapper (SSR) & mounts target app on click', ({I}) => {
    I.amOnPage('/wrapper/');
    I.waitForText('Hello from wrapper!', 10, '#body');

    I.click('Mount actual app', '#body');
    I.waitForText('Welcome to target app', 10, '#body');
    I.see('propFromWrapper', '#body')
    I.see('fromClick', '#body')
});

Scenario('Renders App Wrapper (CSR) & mounts target app on click', ({I}) => {
    I.amOnPage('/');
    I.click(`a[href="/wrapper/"]`);
    I.waitForText('Hello from wrapper!', 10, '#body');

    I.click('Mount actual app', '#body');
    I.waitForText('Welcome to target app', 10, '#body');
    I.see('propFromWrapper', '#body')
    I.see('fromClick', '#body')
});

Scenario('Renders Target App (SSR)', ({I}) => {
    I.amOnPage('/wrapper/?showApp=1');
    I.waitForText('Welcome to target app', 10, '#body');
    I.see('propFromWrapper', '#body')
    I.see('fromLocation', '#body')
});

Scenario('Renders Target App (CSR)', ({I}) => {
    I.amOnPage('/wrapper/');
    I.waitForText('Hello from wrapper!', 10, '#body');
    I.click('Mount actual app', '#body');

    I.waitForText('Welcome to target app', 10, '#body');
    I.click(`a[href="/nosuchpath"]`);
    I.waitForText('404', 10, '#body');
    I.executeScript('window.history.back();');

    I.waitForText('Welcome to target app', 10, '#body');
    I.see('propFromWrapper', '#body')
    I.see('fromLocation', '#body')
});
