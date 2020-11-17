import {
    HttpError,
    fetchUtils,
} from 'react-admin';

/**
 * The following code was taken from react-admin and modified to pass response.body as an error message to HttpError
 * and omit empty values of request.body before send it to server side
 * @see {@link https://github.com/marmelab/react-admin/blob/master/packages/ra-core/src/dataProvider/fetch.ts#L30}
 */
const fetchJson = (url, options = {}) => {
    const requestHeaders = fetchUtils.createHeadersFromOptions(options);

    return fetch(url, {...options, headers: requestHeaders})
        .then(response =>
            response.text().then(text => ({
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: text,
            }))
        )
        .then(({status, statusText, headers, body}) => {
            let json;
            try {
                json = JSON.parse(body);
            } catch (e) {
                json = {
                    message: body,
                };
            }
            if (status < 200 || status >= 300) {
                return Promise.reject(
                    new HttpError(
                        (json && json.message) || statusText,
                        status,
                        json
                    )
                );
            }
            return Promise.resolve({status, headers, body, json});
        });
};

export default fetchJson;
