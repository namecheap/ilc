import axios from 'axios';

// TODO Need to add types
async function renderTemplate(template: any) {
    const includesAttributes: any = matchAllIncludesAttributes(template);

    const includesData = await Object.keys(includesAttributes).reduce(async (
        promisifiedIncludes: any,
        include: any,
    ) => {
        const includes = await promisifiedIncludes;
        const {
            src,
            timeout = 10000,
            id,
        } = includesAttributes[include];

        try {
            if (!id || !src) {
                throw new Error(`Necessary attribute src or id was not provided by ${include}!`);
            }

            const response = await axios.get(src, {
                timeout: +timeout,
            });

            return {
                ...includes,
                // TODO Need to add html comments above and beyound about an include with include's id
                [include]: response.data,
            };
        } catch (error) {
            // TODO Need to add correct error handling
            console.error(error);
            return {
                ...includes,
                [include]: include,
            };
        }
    }, Promise.resolve({}));

    return Object.keys(includesData).reduce((
        template: any,
        include: any,
    ) => template.split(include).join(includesData[include]), template);
};

function matchAllIncludesAttributes(template: any) {
    const includesRegExp = /\<include(?:\s*\w*\=\"[^\"]*\"\s*)*\s*(?:\/\>|\>\s*.*\s*\<\/include\>)/gmi;
    const includesAttributesRegExp = /\w*\=\"[^\"]*\"/gmi;

    const matchedAllIncludes = Array.from(template.matchAll(includesRegExp));
    const includesAttributes: any = matchedAllIncludes.reduce((
        includes: any,
        [include]: any,
    ) => {
        const matchedAllAttributes = Array.from(include.matchAll(includesAttributesRegExp));
        const attributes = matchedAllAttributes.reduce((
            attributes: any,
            [attribute]: any,
        ) => {
            const [key, value] = attribute.split('=');

            attributes[key] = value.split('\"').join('');

            return attributes;
        }, {});

        includes[include] = attributes;

        return includes;
    }, {});

    return includesAttributes;
}

export default renderTemplate;
