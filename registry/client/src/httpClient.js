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

    /**
     * Need to remove empty values from request.body before send it
     * react-admin set null by default to all values that would be removed while updating
     */
    if (options.body) {
        let parsedBody;

        try {
            parsedBody = JSON.parse(options.body);
        } catch (e) {}

        if (parsedBody !== undefined) {
            const omittedBody = omitEmptyValues(parsedBody);
            options.body = JSON.stringify(omittedBody);
        }
    }

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

function omitEmptyValues(requestBody) {
    let body = requestBody;

    if (typeof requestBody === 'object') {
        body = Object.assign({}, requestBody);
        Object.keys(body).forEach((key) => omitNull(body, key));
    }

    if (Array.isArray(requestBody)) {
        body = Array.from(requestBody);
        body.forEach((value, index) => omitNull(body, index));
    }

    function omitNull(body, index) {
        if (body[index] === null) {
            delete body[index];
        }

        if (typeof body[index] === 'object' || Array.isArray(body[index])) {
            body[index] = omitEmptyValues(body[index]);
        }
    }

    return body;
}

export default fetchJson;