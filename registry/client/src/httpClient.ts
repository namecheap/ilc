import { HttpError, fetchUtils } from 'react-admin';

/**
 * The following code was taken from react-admin and modified to pass response.body as an error message to HttpError
 * @see {@link https://github.com/marmelab/react-admin/blob/master/packages/ra-core/src/dataProvider/fetch.ts#L30}
 */
export async function fetchJson(url: string, options: fetchUtils.Options = {}) {
    const requestHeaders = fetchUtils.createHeadersFromOptions(options);

    const response = await fetch(url, { ...options, headers: requestHeaders });
    const body = await response.text();
    const { status, statusText, headers } = response;

    let json;
    try {
        json = JSON.parse(body);
    } catch {
        json = {
            message: body,
        };
    }

    if (status < 200 || status >= 300) {
        throw new HttpError((json && json.message) || statusText, status, json);
    }

    return { status, headers, body, json };
}
