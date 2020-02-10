import axios from 'axios';
import parseLinkHeader from './parseLinkHeader';

interface IncludeAttributes {
    id: string,
    src: string,
    timeout?: string,
}
interface IncludesAttributes {
    [include: string]: IncludeAttributes
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
    const includesRegExp = /<include(?:\s*\w*="[^"]*"\s*)*\s*(?:\/>|>\s*.*\s*<\/include>)/gmi;
    const includesAttributesRegExp = /\w*="[^"]*"/gmi;

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

            const stylesheets = selectStylesheets(link);

            return wrapWithComments(id, stylesheets.join('\n') + data);
        } catch (error) {
            // TODO Need to add correct error handling
            console.error(error);
            return include;
        }
    }));
}

function selectStylesheets(link: string): Array<string> {
    const includeLinkHeader = parseLinkHeader(link);

    return includeLinkHeader.reduce((stylesheets: Array<string>, attributes: any) => {
        if (attributes.rel !== 'stylesheet') {
            return stylesheets;
        }

        stylesheets.push(`<link rel="stylesheet" href="${attributes.uri}">`);

        return stylesheets;
    }, []);
}

function wrapWithComments(id: string, data: string): string {
    return `<!-- Template include "${id}" START -->\n` + data + `\n<!-- Template include "${id}" END -->`;
}

export default renderTemplate;
