import deepmerge from 'deepmerge';
import { TransformedRegistryConfig, TransformedRoute } from '../types/Registry';

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

type OverrideRoute = DeepPartial<TransformedRoute> & { domainId?: number };
export type OverrideConfig = DeepPartial<Pick<TransformedRegistryConfig, 'apps'>> & {
    routes?: OverrideRoute[];
    sharedLibs?: {
        [x: string]: {
            spaBundle: string;
        };
    };
};

export function mergeConfigs(
    original: TransformedRegistryConfig,
    override: OverrideConfig | null | undefined,
    domainId?: number,
): TransformedRegistryConfig {
    if (!override || (!override.apps && !override.routes && !override.sharedLibs)) {
        return original;
    }

    const apps = override.apps ? deepmerge(original.apps ?? {}, override.apps) : original.apps;

    const isSameRoute = (overrideRoute: OverrideRoute, originalRoute: TransformedRoute) =>
        overrideRoute.routeId
            ? overrideRoute.routeId === originalRoute.routeId
            : overrideRoute.route === '*'
              ? overrideRoute.route === originalRoute.route && overrideRoute.orderPos === originalRoute.orderPos
              : overrideRoute.route === originalRoute.route;

    const isSameDomainRoute = (route: OverrideRoute) => route.domainId === domainId;

    const routes = override.routes
        ? [
              ...(original.routes ?? []).map((originalRoute) => {
                  const overrideRoute = override.routes?.find(
                      (x) => isSameRoute(x, originalRoute) && isSameDomainRoute(x),
                  );
                  return overrideRoute ? deepmerge(originalRoute, overrideRoute) : originalRoute;
              }),
              ...(override.routes.filter(
                  (overrideRoute) =>
                      !(original.routes || []).some((originalRoute) => isSameRoute(overrideRoute, originalRoute)) &&
                      isSameDomainRoute(overrideRoute),
              ) as TransformedRoute[]),
          ].sort((a, b) => a.orderPos - b.orderPos)
        : original.routes;

    const sharedLibs = override.sharedLibs
        ? Object.entries(override.sharedLibs).reduce(
              (acc, [sharedLibName, sharedLibConfig]) => {
                  acc[sharedLibName] = sharedLibConfig.spaBundle;
                  return acc;
              },
              { ...original.sharedLibs },
          )
        : original.sharedLibs;

    return {
        ...original,
        apps,
        routes,
        sharedLibs,
    };
}
