// TODO Copied from tailorX, need to move this into a library

export type ParsedLink = {
    params: {
        [key: string]: string;
    };
    rel: string | null;
    uri: string;
};

/**
 * Parse link headers
 * '<http://example.com/script.js>; rel="fragment-script"'
 *
 * [
 *   {
 *     rel: "fragment-script",
 *     uri: "http://localhost:8080/script.js"
 *   }
 * ]
 *
 * Based on code from parse-link-header!
 * https://github.com/thlorenz/parse-link-header/blob/master/index.js
 */
function parseLinkHeader(linkHeader: string): ParsedLink[] {
    return fixLink(linkHeader)
        .split(/,\s*</)
        .reduce<ParsedLink[]>((result, link: string) => {
            const match = link.match(/<?([^>]*)>(.*)/);

            if (!match) {
                return result;
            }

            const uri = match[1];
            const rel = getRelValue(match[2]);
            const params = getParams(match[2]);

            if (rel !== null) {
                result.push({ uri, rel, params });
            }

            return result;
        }, []);
}

/**
 * Get the value of rel attribute
 *
 * rel="fragment-script" -> ["rel", "fragment-script"]
 */
function getRelValue(parts: string): string | null {
    const m = parts.match(/\s*rel\s*=\s*"?([^"]+)"?/);
    if (!m) {
        return null;
    }
    return m[1];
}

/**
 * Get the params of rel attribute
 *
 * rel="fragment-script" -> ["rel", "fragment-script"]
 */
function getParams(parts: string): { [key: string]: string } {
    return parts.split(';').reduce((acc: { [key: string]: string }, attribute) => {
        let [key, value] = attribute.trim().split('=');
        key = key.trim();

        if (value === undefined || key === 'rel') {
            return acc;
        }

        acc[key] = value
            .trim()
            .replace(/(^"|"$)/g, '')
            .trim();

        return acc;
    }, {});
}

function fixLink(headerLink: string): string {
    return headerLink
        .split(',')
        .map((link) => {
            return link
                .split(';')
                .map((attribute, index) => {
                    if (index) {
                        const [key, value] = attribute.trim().split('=');
                        return !value || value.trim().startsWith('"') ? attribute : `${key}="${value}"`;
                    } else {
                        return !attribute || attribute.trim().startsWith('<') ? attribute : `<${attribute}>`;
                    }
                })
                .join(';');
        })
        .join(',');
}

export default parseLinkHeader;
