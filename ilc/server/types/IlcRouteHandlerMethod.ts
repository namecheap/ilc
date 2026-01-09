import type { RouteGenericInterface, RouteHandlerMethod } from 'fastify';
import type http from 'http';
import type { PatchedHttpRequest } from './PatchedHttpRequest';

export type IlcRouteHandlerMethod<RouteGeneric extends RouteGenericInterface = RouteGenericInterface> =
    RouteHandlerMethod<http.Server, PatchedHttpRequest, http.ServerResponse, RouteGeneric>;
