import type { RouteHandlerMethod } from 'fastify';
import type { RouteGenericInterface } from 'fastify/types/route';
import type http from 'http';
import type { PatchedHttpRequest } from './PatchedHttpRequest';

export type IlcRouteHandlerMethod<RouteGeneric extends RouteGenericInterface = RouteGenericInterface> =
    RouteHandlerMethod<http.Server, PatchedHttpRequest, http.ServerResponse, RouteGeneric>;
