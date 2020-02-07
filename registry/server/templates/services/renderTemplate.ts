import axios from 'axios';

interface IncludeAttributes {
    id: string,
    src: string,
    timeout?: string,
}
interface IncludesAttributes {
    [include: string]: IncludeAttributes
}

interface IncludeLinkHeader {
    [href: string]: {
        [key: string]: string,
    }
}

async function renderTemplate(template: string): Promise<string> {
    const includesAttributes = matchIncludesAttributes(template);

    if (!Object.keys(includesAttributes).length) {
        return template;
    }

    const duplicateIncludesAttributes = selectDuplicateIncludesAttributes(includesAttributes);

    if (!!duplicateIncludesAttributes.length) {
        throw new Error(
            `The current template has next duplicate includes sources or ids as follows: \n` +
            `${Array.from(new Set(duplicateIncludesAttributes.map(({ id, src }: IncludeAttributes) => (id || src)))).join(',\n')}`
        );
    };

    const includesData = await fetchIncludes(includesAttributes);

    return Object.keys(includesAttributes).reduce((
        template: string,
        include: string,
        includeDataIndex: number,
    ) => template.split(include).join(includesData[includeDataIndex]), template);
};

function matchIncludesAttributes(template: string): IncludesAttributes {
    const includesRegExp = /\<include(?:\s*\w*\=\"[^\"]*\"\s*)*\s*(?:\/\>|\>\s*.*\s*\<\/include\>)/gmi;
    const includesAttributesRegExp = /\w*\=\"[^\"]*\"/gmi;

    const matchedIncludes = Array.from(template.matchAll(includesRegExp));

    if (!matchedIncludes.length) {
        return {};
    }

    const includes = matchedIncludes.map(([include]: any) => include);

    return includes.reduce((
        includes: any,
        include: any,
    ) => {
        const matchedAttributes = Array.from(include.matchAll(includesAttributesRegExp));
        const attributes = matchedAttributes.map(([attribute]: any) => attribute);

        includes[include] = attributes.reduce((
            attributes: any,
            attribute: any,
        ) => {
            const [key, value] = attribute.split('=');
            attributes[key] = value.split('\"').join('');
            return attributes;
        }, {});

        return includes;
    }, {});
}

function selectDuplicateIncludesAttributes(includesAttributes: IncludesAttributes): Array<IncludeAttributes> {
    const attributes = Object.values(includesAttributes);

    if (!attributes.length) {
        return [];
    }

    return Object.values(includesAttributes).filter((
        currentAttributes: IncludeAttributes,
        index,
        attributes
    ) =>
        (currentAttributes.id || currentAttributes.src) &&
        attributes.findIndex(({ id, src }: IncludeAttributes) => id === currentAttributes.id || src === currentAttributes.src) !== index);
}

async function fetchIncludes(includesAttributes: IncludesAttributes): Promise<Array<string>> {
    const includes = Object.keys(includesAttributes);

    if (!includes.length) {
        return [];
    }

    return Promise.all(includes.map(async (include: string) => {
        try {
            const {
                src,
                timeout = 10000,
                id,
            } = includesAttributes[include];

            if (!id || !src) {
                throw new Error(`Necessary attribute src or id was not provided by ${include}!`);
            }

            const {
                data,
                headers: {
                    link,
                }
            } = await axios.get(src, {
                timeout: +timeout,
            });
            const includeLinkHeader = matchIncludeLinkHeader(link);
            const stylesheets = selectStylesheets(includeLinkHeader);

            if (!stylesheets.length) {
                return data;
            }

            // TODO Need to add html comments above and beyound about an include with include's id
            return data + '\n' + stylesheets.join('\n');
        } catch (error) {
            // TODO Need to add correct error handling
            console.error(error);
            return include;
        }
    }));
}

function matchIncludeLinkHeader(linkHeader: string): IncludeLinkHeader {
    if (!linkHeader) {
        return {};
    };

    // TODO It need to update to cover all cases with a link header
    const [href, ...attributes] = linkHeader.split(';');
    const matchedAttributes = attributes.reduce((attributes: {[key: string]: string}, attribute: string) => {
        const [key, value] = attribute.split('=');
        attributes[key] = value;

        return attributes;
    }, {});

    return {
        [href]: matchedAttributes,
    };
};

function selectStylesheets(includeLinkHeader: IncludeLinkHeader): Array<string> {
    const hrefs = Object.keys(includeLinkHeader);

    if (!hrefs.length) {
        return [];
    }

    return hrefs.reduce((stylesheets: Array<string>, href: string) => {
        const attributes = includeLinkHeader[href];

        if (attributes.rel !== 'stylesheet') {
            return stylesheets;
        }

        stylesheets.push(`<link rel="stylesheet" href="${href}">`);

        return stylesheets;
    }, []);
}

export default renderTemplate;
