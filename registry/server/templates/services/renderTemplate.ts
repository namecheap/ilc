import axios from 'axios';
import uuidv4 from 'uuid/v4';

import parseLinkHeader from './parseLinkHeader';
import noticeError from '../../errorHandler/noticeError';

interface IncludeAttributes {
    id: string,
    src: string,
    timeout?: string,
}
interface IncludesAttributes {
    [include: string]: IncludeAttributes
}

async function renderTemplate(template: string): Promise<{content: string, styleRefs: Array<string>}> {
    const includesAttributes = matchIncludesAttributes(template);

    if (!Object.keys(includesAttributes).length) {
        return {
            content: template,
            styleRefs: [],
        };
    }

    const duplicateIncludesAttributes = selectDuplicateIncludesAttributes(includesAttributes);

    if (!!duplicateIncludesAttributes.length) {
        throw new Error(
            `The current template has next duplicate includes sources or ids as follows: \n` +
            `${Array.from(new Set(duplicateIncludesAttributes.map(({ id, src }: IncludeAttributes) => (id || src)))).join(',\n')}`
        );
    };

    const includes = await fetchIncludes(includesAttributes);

    const content = Object.keys(includesAttributes).reduce((
        template: string,
        include: string,
        includeDataIndex: number,
    ) => template.split(include).join(includes[includeDataIndex].data), template);

    const styleRefs = includes
        .reduce((styleRefs: Array<string>, currInclude) => styleRefs.concat(currInclude.styleRefs), [])
        .filter((styleRef, index, styleRefs) => styleRefs.indexOf(styleRef) === index);

    return {
        content,
        styleRefs,
    };
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
            const key = attribute.split('=', 1)[0];
            const value = attribute.substring(attribute.indexOf('=') + 1);
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

async function fetchIncludes(includesAttributes: IncludesAttributes): Promise<Array<{data: string, styleRefs: Array<string>}>> {
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

            let {
                data,
                headers: {
                    link,
                }
            } = await axios.get(src, {
                timeout: +timeout,
            });

            let styleRefs: Array<string> = [];

            if (link) {
                styleRefs = selectStyleRefs(link);
                data = styleRefs.map(wrapWithStylesheetLink).join('\n') + data;
            }

            return {
                data: wrapWithComments(id, data),
                styleRefs,
            };
        } catch (error) {
            noticeError(error, {
                type: 'FETCH_INCLUDE_ERROR',
                errorId: uuidv4(),
            });

            return {
                data: include,
                styleRefs: [],
            };
        }
    }));
}

function selectStyleRefs(link: string): Array<string> {
    const includeLinkHeader = parseLinkHeader(link);

    return includeLinkHeader.reduce((styleRefs: Array<string>, attributes: any) => {
        if (attributes.rel !== 'stylesheet') {
            return styleRefs;
        }

        styleRefs.push(attributes.uri);

        return styleRefs;
    }, []);
}

function wrapWithStylesheetLink(styleRef: string): string {
    return `<link rel="stylesheet" href="${styleRef}">`;
}

function wrapWithComments(id: string, data: string): string {
    return `<!-- Template include "${id}" START -->\n` + data + `\n<!-- Template include "${id}" END -->`;
}

export default renderTemplate;
