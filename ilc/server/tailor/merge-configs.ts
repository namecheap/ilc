import deepmerge from 'deepmerge';
import { TransformedRegistryConfig, TransformedRoute } from '../types/Registry';

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

type OverrideRoute = DeepPartial<TransformedRoute> & { domainId?: number; domainAlias?: string };
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
    domainAlias?: string,
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

    const isSameDomainRoute = (route: OverrideRoute) => {
        if (route.domainAlias !== undefined) {
            return route.domainAlias === domainAlias;
        }
        return route.domainId === undefined || route.domainId === domainId;
    };

    const hasDomainSpecificOverride = (route: OverrideRoute) =>
        override.routes?.some(
            (x) =>
                x !== route &&
                isSameRoute(x, route as TransformedRoute) &&
                x.routeId === undefined &&
                (x.domainId !== undefined || x.domainAlias !== undefined) &&
                isSameDomainRoute(x),
        ) ?? false;

    const routes = override.routes
        ? [
              ...(original.routes ?? []).map((originalRoute) => {
                  const overrideRoute = override.routes?.find(
                      (x) =>
                          isSameRoute(x, originalRoute) &&
                          isSameDomainRoute(x) &&
                          // Domain-specific overrides matched by path (not routeId) should be
                          // added as new routes, not merged into domain-agnostic originals
                          (x.routeId !== undefined || (x.domainId === undefined && x.domainAlias === undefined)) &&
                          // Skip non-domain-specific overrides when a domain-specific override
                          // for the same path exists — the domain-specific one will be added as
                          // a new route and should take precedence
                          !(x.domainId === undefined && x.domainAlias === undefined && hasDomainSpecificOverride(x)),
                  );
                  return overrideRoute ? deepmerge(originalRoute, overrideRoute) : originalRoute;
              }),
              ...(override.routes.filter(
                  (overrideRoute) =>
                      !(original.routes || []).some(
                          (originalRoute) =>
                              isSameRoute(overrideRoute, originalRoute) &&
                              // Domain-specific override routes matched by path (not routeId) should
                              // be added as new routes even when an original with the same path exists,
                              // since original routes are domain-filtered and don't carry domainId
                              (overrideRoute.routeId !== undefined ||
                                  (overrideRoute.domainId === undefined && overrideRoute.domainAlias === undefined)),
                      ) && isSameDomainRoute(overrideRoute),
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

    return applyDomainPropsToLdeApps({ ...original, apps, routes, sharedLibs }, override, original);
}

function applyDomainPropsToLdeApps(
    result: TransformedRegistryConfig,
    override: OverrideConfig,
    original: TransformedRegistryConfig,
): TransformedRegistryConfig {
    if (!override.apps || (!result.domainProps && !result.domainSsrProps)) {
        return result;
    }

    const apps = { ...result.apps };
    for (const appName of Object.keys(override.apps)) {
        if (!original.apps[appName] && apps[appName]) {
            const app = { ...apps[appName] };
            if (result.domainProps) {
                app.props = deepmerge(result.domainProps, app.props ?? {});
            }
            if (result.domainSsrProps) {
                app.ssrProps = deepmerge(result.domainSsrProps, app.ssrProps ?? {});
            }
            apps[appName] = app;
        }
    }

    return { ...result, apps };
}
