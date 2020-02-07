import axios from 'axios';

// TODO Need to add types
async function renderTemplate(template: any) {
    const includesAttributes: any = matchIncludesAttributes(template);
    const duplicateIncludesAttributes = selectDuplicateIncludesAttributes(includesAttributes);

    if (!!duplicateIncludesAttributes.length) {
        throw new Error(
            `The current template has next duplicate includes sources or ids as follows: \n`+
            `${Array.from(new Set(duplicateIncludesAttributes.map(({id, src}: any) => (id || src)))).join(',\n')}`
        );
    };

    const includes = Object.keys(includesAttributes);

    const includesData = await Promise.all(includes.map(async (include: any) => {
        try {
            const {
                src,
                timeout = 10000,
                id,
            } = includesAttributes[include];

            if (!id || !src) {
                throw new Error(`Necessary attribute src or id was not provided by ${include}!`);
            }

            const response = await axios.get(src, {
                timeout: +timeout,
            });

            // TODO Need to add html comments above and beyound about an include with include's id
            return response.data;
        } catch (error) {
            // TODO Need to add correct error handling
            console.error(error);
            return include;
        }
    }));

    return includes.reduce((
        template: any,
        include: any,
        includeDataIndex,
    ) => template.split(include).join(includesData[includeDataIndex]), template);
};

function matchIncludesAttributes(template: any) {
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

function selectDuplicateIncludesAttributes(includesAttributes: any) {
    return Object.values(includesAttributes).filter((
        currentAttributes: any,
        index,
        attributes
    ) =>
        (currentAttributes.id || currentAttributes.src) &&
        attributes.findIndex(({id, src}: any) => id === currentAttributes.id || src === currentAttributes.src) !== index);
}

export default renderTemplate;
