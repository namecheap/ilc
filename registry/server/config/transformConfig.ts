import { merge, omitBy, pick } from 'lodash';
import { App } from '../apps/interfaces';
import { parseJSON } from '../common/services/json';
import { appendDigest } from '../util/hmac';
import { VersionedRecord } from '../versioning/interfaces';
import RouterDomains from '../routerDomains/interfaces';

type Dict = Record<string, any>;
type TransformedApp = VersionedRecord<Omit<App, 'enforceDomain'>> & {
    ssr: Dict | null;
    dependencies: Dict | null;
    props: Dict | null;
    ssrProps: Dict | null;
    enforceDomain?: string;
};
type ResponseApp = Pick<
    TransformedApp,
    | 'kind'
    | 'ssr'
    | 'dependencies'
    | 'props'
    | 'ssrProps'
    | 'spaBundle'
    | 'cssBundle'
    | 'wrappedWith'
    | 'enforceDomain'
    | 'l10nManifest'
    | 'versionId'
>;

/**
 * TODO change type of routerDomains to actual
 * TODO change type of sharedProps to actual
 */
export function transformApps(
    apps: VersionedRecord<App>[],
    routerDomains: RouterDomains[],
    sharedProps: any[],
): Record<string, ResponseApp> {
    return apps.reduce(
        (acc, app) => {
            const getDomainName = (domainId: number) => routerDomains.find((x) => x.id === domainId)?.domainName;

            const jsonParsedApp: TransformedApp = {
                ...app,
                versionId: appendDigest(app.versionId, 'app'),
                ssr: parseJSON<TransformedApp['ssr']>(app.ssr),
                dependencies: parseJSON<TransformedApp['dependencies']>(app.dependencies),
                props: parseJSON<TransformedApp['props']>(app.props),
                ssrProps: parseJSON<TransformedApp['ssrProps']>(app.ssrProps),
                enforceDomain: app.enforceDomain ? getDomainName(app.enforceDomain) : undefined,
            };

            if (sharedProps.length && app.configSelector !== null) {
                parseJSON<string[]>(app.configSelector).forEach((configSelectorName) => {
                    const commonConfig = sharedProps.find((n) => n.name === configSelectorName);
                    if (commonConfig) {
                        jsonParsedApp.props = merge({}, parseJSON(commonConfig.props), jsonParsedApp.props);
                        jsonParsedApp.ssrProps = merge({}, parseJSON(commonConfig.ssrProps), jsonParsedApp.ssrProps);
                    }
                });
            }

            const compactedApp = omitBy<TransformedApp>(
                jsonParsedApp,
                (v) => v === null || (typeof v === 'object' && Object.keys(v).length === 0),
            );

            acc[compactedApp.name!] = pick(compactedApp as TransformedApp, [
                'kind',
                'ssr',
                'dependencies',
                'props',
                'ssrProps',
                'spaBundle',
                'cssBundle',
                'wrappedWith',
                'enforceDomain',
                'l10nManifest',
                'versionId',
            ]);

            return acc;
        },
        {} as Record<string, ResponseApp>,
    );
}
