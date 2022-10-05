import axios from 'axios';

import parseLinkHeader from './parseLinkHeader';
import errors from '../errors';
import { uniqueArray } from '../../util/helpers';

interface IncludeAttributes {
    id: string,
    src: string,
    timeout?: string,
}
interface IncludesAttributes {
    [include: string]: IncludeAttributes
}

type FetchedIncludes = {
    includeHtmlTag: string;
    includeResult: string;
    styleRefs: string[];
}[];

type RenderTemplateResult = {
    content: string;
    styleRefs: string[];
};

async function renderTemplate(template: string): Promise<RenderTemplateResult> {
    const includesAttributes = matchIncludesAttributes(template);

    const result: RenderTemplateResult = {
        content: template,
        styleRefs: [],
    };

    if (!Object.keys(includesAttributes).length) {
        return result;
    }

    const duplicateIncludesAttributes = selectDuplicateIncludesAttributes(includesAttributes);

    if (!!duplicateIncludesAttributes.length) {
        throw new Error(
            `The current template has next duplicate includes sources or ids as follows: \n` +
            `${Array.from(new Set(duplicateIncludesAttributes.map(({ id, src }: IncludeAttributes) => (id || src)))).join(',\n')}`
        );
    }

    const fetchedIncludes = await fetchIncludes(includesAttributes);

    fetchedIncludes.forEach(({ includeHtmlTag, includeResult, styleRefs }) => {
        result.styleRefs = result.styleRefs.concat(styleRefs);
        result.content = result.content.replace(includeHtmlTag, includeResult);
    });

    result.styleRefs = uniqueArray(result.styleRefs);

    return result;
}

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

async function fetchIncludes(includesAttributes: IncludesAttributes): Promise<FetchedIncludes> {
    const includeHtmlTags = Object.keys(includesAttributes);

    if (!includeHtmlTags.length) {
        return [];
    }

    return Promise.all(includeHtmlTags.map(async (includeHtmlTag: string) => {
        const parsedHtmlTag = includesAttributes[includeHtmlTag];
        const { id, src, timeout = 10000 } = parsedHtmlTag;

        try {
            if (!id || !src) {
                throw new Error(`Necessary attribute src or id was not provided by ${includeHtmlTag}!`);
            }

            let {
                data,
                headers: {
                    link,
                },
            } = await axios.get(src, {
                timeout: +timeout,
            });

            let styleRefs: Array<string> = [];

            if (link) {
                const refs = selectStyleAndScriptRefs(link);
                styleRefs = refs.styles;
                const stylesheets = refs.styles.map(wrapWithStylesheetLink);
                const scripts = refs.scripts.map(wrapWithScriptTag);
                data = stylesheets.join('\n') + data;
                if (scripts.length) {
                    data += '\n' + scripts.join('\n');
                }
            }

            return {
                includeHtmlTag,
                includeResult: wrapWithComments(id, data),
                styleRefs,
            };
        } catch (e: any) {
            throw new errors.FetchIncludeError({
                message: `Failed to fetch include with ID "${id}" due to: ${e.message}`,
                cause: e,
                data: {
                    include: includeHtmlTag,
                }
            })
        }
    }));
}

function selectStyleAndScriptRefs(link: string) {
    const includeLinkHeader = parseLinkHeader(link);

    return includeLinkHeader.reduce((acc: Record<'styles' | 'scripts', string[]>, attributes: any) => {
        if (attributes.rel === 'stylesheet') {
            acc.styles.push(attributes.uri);
        } else if (attributes.rel === 'script') {
            acc.scripts.push(attributes.uri);
        }

        return acc;
    }, {
        styles: [],
        scripts: [],
    });
}

function wrapWithStylesheetLink(styleRef: string): string {
    return `<link rel="stylesheet" href="${styleRef}">`;
}

function wrapWithScriptTag(url: string): string {
    return `<script src="${url}" crossorigin="anonymous"></script>`;
}

function wrapWithComments(id: string, data: string): string {
    return `<!-- Template include "${id}" START -->\n` + data + `\n<!-- Template include "${id}" END -->`;
}

export default renderTemplate;
