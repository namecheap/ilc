import { FRAGMENT_KIND } from '../constants';

export type Slot = {
    appName: string;
    kind: 'primary' | 'essential' | 'regular' | null;
    props: {};
};

export type RouteMeta = {
    canonicalUrl?: string;
    [key: string]: unknown;
};

export type BaseRoute = {
    slots: Record<string, Slot>;
    meta: RouteMeta;
    next: boolean;
    versionId: string;
    domain?: string;
};

export type Route = BaseRoute & {
    routeId?: number;
    route: string;
    template?: string;
    orderPos: number;
};

export type SpecialRoute = BaseRoute & {
    routeId: number;
    template: string;
    specialRole: string;
};

export interface ClientRouter {
    getCurrentRoute(): Route;
    getPrevRoute(): Route;
    getCurrentRouteProps(appName: string, slotName: string): Record<string, any>;
    getPrevRouteProps(appName: string, slotName: string): Record<string, any>;
    match(url: string): RouterMatch;
    navigateToUrl(url: string): void;
    getRelevantAppKind(appName: string, slotName: string): typeof FRAGMENT_KIND;
    isAppWithinSlotActive(appName: string, slotName: string): boolean;
}

export interface RouterMatch {
    basePath: string;
    reqUrl: string;
    route?: string;
    template: string;
    specialRole: number | null;
    meta: RouteMeta;
    slots: Record<string, Slot>;
}
