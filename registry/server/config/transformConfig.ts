import { merge, omitBy, pick } from 'lodash';
import { App } from '../apps/interfaces';
import { parseJSON } from '../common/services/json';
import { appendDigest } from '../util/hmac';
import { VersionedRecord } from '../versioning/interfaces';
import RouterDomains from '../routerDomains/interfaces';
import { AppRoute, AppRouteSlot } from '../appRoutes/interfaces';
import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import { SharedLib } from '../sharedLibs/interfaces';

type Dict = Record<string, any>;
type TransformedApp = VersionedRecord<Omit<App, 'enforceDomain'>> & {
    ssr: Dict | null;
    dependencies: Dict | null;
    props: Dict | null;
    ssrProps: Dict | null;
    enforceDomain?: string;
};
export type AppDto = Pick<
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
): Record<string, AppDto> {
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
        {} as Record<string, AppDto>,
    );
}

type AppSlotDto = {
    appName: string;
    props: Record<string, any>;
    kind: string;
};
export type AppRouteDto = {
    routeId: number;
    route?: string;
    next: boolean;
    template?: string;
    specialRole?: string;
    domain?: string;
    orderPos?: number;
    versionId: string;
    meta: Record<string, any>;
    slots: Record<string, AppSlotDto>;
};

function transformAppRouteSlot(dbRoute: VersionedRecord<AppRoute & AppRouteSlot>): AppSlotDto {
    return {
        appName: dbRoute.appName,
        props: dbRoute.props !== null ? parseJSON(dbRoute.props) : {},
        kind: dbRoute.kind!,
    };
}

export function transformRoutes(
    dbRoutes: VersionedRecord<AppRoute & AppRouteSlot>[],
    routerDomains: RouterDomains[],
): {
    routes: AppRouteDto[];
    specialRoutes: AppRouteDto[];
} {
    return dbRoutes.reduce(
        (acc, dbRoute) => {
            const transformedRoute = transformSpecialRoutesForConsumer(dbRoute);
            const collection = transformedRoute.specialRole ? acc.specialRoutes : acc.routes;
            const routeDto = collection.find(({ routeId }) => routeId === dbRoute.routeId);
            if (routeDto) {
                if (dbRoute.name !== null) {
                    routeDto.slots[dbRoute.name] = transformAppRouteSlot(dbRoute);
                }
            } else {
                const newAppRouteDto = {
                    slots: {} as Record<string, AppSlotDto>,
                    meta: (transformedRoute.meta ? parseJSON(transformedRoute.meta) : {}) as Record<string, any>,
                    routeId: dbRoute.routeId ?? undefined,
                    route: transformedRoute.route,
                    next: !!transformedRoute.next,
                    template: transformedRoute.templateName ?? undefined,
                    specialRole: transformedRoute.specialRole,
                    domain:
                        transformedRoute.domainId === null
                            ? undefined
                            : routerDomains.find(({ id }) => id === transformedRoute.domainId)?.domainName,
                    orderPos: transformedRoute.orderPos ?? undefined,
                    versionId: appendDigest(dbRoute.versionId, 'route'),
                };
                if (dbRoute.name !== null) {
                    newAppRouteDto.slots[dbRoute.name] = transformAppRouteSlot(dbRoute);
                }
                collection.push(newAppRouteDto);
            }

            return acc;
        },
        {
            routes: [] as AppRouteDto[],
            specialRoutes: [] as AppRouteDto[],
        },
    );
}

type DynamicLibDto = {
    spaBundle: string;
    l10nManifest?: string | null;
    versionId: string;
};
export function transformSharedLibs(sharedLibs: VersionedRecord<SharedLib>[]): {
    sharedLibs: Record<string, string>;
    dynamicLibs: Record<string, DynamicLibDto>;
} {
    return sharedLibs.reduce(
        (acc, lib) => {
            acc.sharedLibs[lib.name] = lib.spaBundle;
            acc.dynamicLibs[lib.name] = {
                spaBundle: lib.spaBundle,
                l10nManifest: lib.l10nManifest,
                versionId: appendDigest(lib.versionId, 'sharedLib'),
            };
            return acc;
        },
        {
            sharedLibs: {} as Record<string, string>,
            dynamicLibs: {} as Record<string, DynamicLibDto>,
        },
    );
}
