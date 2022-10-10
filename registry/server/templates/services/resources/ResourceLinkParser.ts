import parseLinkHeader, { ParsedLink } from '../parseLinkHeader';
import { Resource } from './Resource';
import { ResourceScript } from './ResourceScript';
import { ResourcePreload } from './ResourcePreload';
import { ResourceStylesheet } from './ResourceStylesheet';

export class ResourceLinkParser {
    public static parse(link: string): Resource[] {
        const parsedLinks: ParsedLink[] = parseLinkHeader(link);

        return parsedLinks.reduce((resources: Resource[], parsedLink: ParsedLink) => {
            const { rel, uri, params } = parsedLink;

            switch(rel) {
                case 'script':
                    resources.push(new ResourceScript(uri, params));
                    break;

                case 'preload':
                    resources.push(new ResourcePreload(uri, params));
                    break;

                case 'stylesheet':
                    resources.push(new ResourceStylesheet(uri, params));
                    break;
            }

            return resources;
        }, []);
    }
}
