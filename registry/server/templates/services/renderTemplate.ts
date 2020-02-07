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
    const includes = matchedIncludes.map(([include]: any) => include);

    const includesAttributes: any = includes.reduce((
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

    return includesAttributes;
}

function selectDuplicateIncludesAttributes(includesAttributes: IncludesAttributes): Array<IncludeAttributes> {
    return Object.values(includesAttributes).filter((
        currentAttributes: IncludeAttributes,
        index,
        attributes
    ) =>
        (currentAttributes.id || currentAttributes.src) &&
        attributes.findIndex(({ id, src }: IncludeAttributes) => id === currentAttributes.id || src === currentAttributes.src) !== index);
}

async function fetchIncludes(includesAttributes: IncludesAttributes) {
    return Promise.all(Object.keys(includesAttributes).map(async (include: string) => {
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
    return Object.keys(includeLinkHeader).reduce((stylesheets: Array<string>, href: string) => {
        const attributes = includeLinkHeader[href];

        if (attributes.rel !== 'stylesheet') {
            return stylesheets;
        }

        stylesheets.push(`<link rel="stylesheet" href="${href}">`);

        return stylesheets;
    }, []);
}

export default renderTemplate;
