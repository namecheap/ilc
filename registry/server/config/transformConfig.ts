import type { AppRow } from '../apps/interfaces';
import { parseJSON } from '../common/services/json';
import { appendDigest } from '../util/hmac';
import { deepMerge } from '../util/deepMerge';
import { VersionedRecord } from '../versioning/interfaces';
import type { RouterDomainsRow } from '../routerDomains/interfaces';
import type { RouteWithSlotRow } from '../appRoutes/interfaces';
import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import type { SharedLibRow } from '../sharedLibs/interfaces';
import type { SharedPropsRow } from '../sharedProps/interfaces';

type Dict = Record<string, any>;
type TransformedApp = VersionedRecord<Omit<AppRow, 'enforceDomain'>> & {
    ssr: Dict | null;
    dependencies: Dict | null;
    discoveryMetadata: Dict | null;
    props: Dict | null;
    ssrProps: Dict | null;
    enforceDomain?: string;
};
export type AppDto = Pick<
    TransformedApp,
    | 'kind'
    | 'ssr'
    | 'dependencies'
    | 'discoveryMetadata'
    | 'props'
    | 'ssrProps'
    | 'spaBundle'
    | 'cssBundle'
    | 'wrappedWith'
    | 'enforceDomain'
    | 'l10nManifest'
    | 'versionId'
>;
const appDtoKeys: (keyof AppDto)[] = [
    'kind',
    'ssr',
    'dependencies',
    'discoveryMetadata',
    'props',
    'ssrProps',
    'spaBundle',
    'cssBundle',
    'wrappedWith',
    'enforceDomain',
    'l10nManifest',
    'versionId',
];

function isEmptyAppValue(value: unknown): boolean {
    return value === null || (typeof value === 'object' && Object.keys(value).length === 0);
}

export function transformApps(
    apps: VersionedRecord<AppRow>[],
    routerDomains: RouterDomainsRow[],
    sharedProps: SharedPropsRow[],
    domainName?: string,
): Record<string, AppDto> {
    const currentDomain = domainName ? routerDomains.find((d) => d.domainName === domainName) : null;

    return apps.reduce(
        (acc, app) => {
            const getDomainName = (domainId: number) => routerDomains.find((x) => x.id === domainId)?.domainName;

            const jsonParsedApp: TransformedApp = {
                ...app,
                versionId: appendDigest(app.versionId, 'app'),
                ssr: parseJSON<TransformedApp['ssr']>(app.ssr),
                dependencies: parseJSON<TransformedApp['dependencies']>(app.dependencies),
                discoveryMetadata: parseJSON<TransformedApp['discoveryMetadata']>(app.discoveryMetadata),
                props: parseJSON<TransformedApp['props']>(app.props),
                ssrProps: parseJSON<TransformedApp['ssrProps']>(app.ssrProps),
                enforceDomain: app.enforceDomain ? getDomainName(app.enforceDomain) : undefined,
            };

            // Apply domain-specific props
            if (currentDomain?.props) {
                jsonParsedApp.props = deepMerge({}, parseJSON(currentDomain.props), jsonParsedApp.props);
            }
            if (currentDomain?.ssrProps) {
                jsonParsedApp.ssrProps = deepMerge({}, parseJSON(currentDomain.ssrProps), jsonParsedApp.ssrProps);
            }

            if (sharedProps.length && app.configSelector !== null) {
                parseJSON<string[]>(app.configSelector).forEach((configSelectorName) => {
                    const commonConfig = sharedProps.find((n) => n.name === configSelectorName);
                    if (commonConfig) {
                        jsonParsedApp.props = deepMerge({}, parseJSON(commonConfig.props), jsonParsedApp.props);
                        jsonParsedApp.ssrProps = deepMerge(
                            {},
                            parseJSON(commonConfig.ssrProps),
                            jsonParsedApp.ssrProps,
                        );
                    }
                });
            }

            acc[app.name] = Object.fromEntries(
                appDtoKeys
                    .filter((key) => key in jsonParsedApp && !isEmptyAppValue(jsonParsedApp[key]))
                    .map((key) => [key, jsonParsedApp[key]]),
            ) as AppDto;

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

function transformAppRouteSlot(dbRoute: RouteWithSlotRow): AppSlotDto {
    return {
        // Only called for rows that have a slot
        appName: dbRoute.appName!,
        props: dbRoute.props !== null ? parseJSON(dbRoute.props) : {},
        kind: dbRoute.kind!,
    };
}

export function transformRoutes(
    dbRoutes: RouteWithSlotRow[],
    routerDomains: RouterDomainsRow[],
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
                    routeId: dbRoute.routeId,
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
export function transformSharedLibs(sharedLibs: VersionedRecord<SharedLibRow>[]): {
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
