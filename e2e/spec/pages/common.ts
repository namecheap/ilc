export const url = {
    urlInternalServerError: '/_ilc/500',
    localhostAsIPv4: 'http://127.0.0.1:8233',
};

export const textError500 = '<h3>ERROR 500</h3>';
export const textError500ForLocalhostAsIPv4 = '<h3>500 Internal Server Error on 127.0.0.1</h3>';
export const textErrorId = 'Error ID:';
// Matches both the server-rendered 404 (wrapped in the SSR container) and the one rendered in the browser.
export const text404NotFoundElement = 'div#body h1';
export const text404NotFound = '404 not found';
export const title404NotFoundForLocalhostAsIPv4 = '404 not found on 127.0.0.1';
export const text404NotFoundForLocalhostAsIPv4 = `<h1>${title404NotFoundForLocalhostAsIPv4}</h1>`;
export const text404NotFoundVue = '404 not found component';
