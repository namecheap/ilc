import { Guard } from "./guard";
import { Request } from "express";
import { isString } from 'lodash';

export const extractHost = (input: string | Request): string => {
    const extract = (host: string): string => {
        const protocol = 'http://';
        const includes = host.includes(protocol);
        const draft = !includes ? protocol + host : host;
        const url = new URL(draft);
        return url.hostname
    };

    if(!isString(input)) {
        const { headers, hostname } = input;
        const outer = headers.host || headers['x-request-host'];
        const host = isString(outer) ? outer : hostname;
        return extract(host);
    }

    if(input === '*') {
        return input;
    }

    return extract(input);
}

export const domainComparator = (current: string, required: string): boolean => (
    extractHost(current) === extractHost(required)
);

export const domainRestrictionGuard: Guard = (predicate: string) => (
    <T extends Record<string, any>>({ domainName }: T): boolean => {

        return [
            domainComparator(predicate, domainName),
            domainName === '*'
        ].some(Boolean);
    }
);
