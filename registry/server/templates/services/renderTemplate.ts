import axios from 'axios';

// TODO Need to add types
async function renderTemplate(template: any) {
    const includesAttributes: any = matchAllIncludesAttributes(template);
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
