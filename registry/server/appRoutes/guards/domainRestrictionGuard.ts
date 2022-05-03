import { Guard } from "./guard";
import { Request } from "express";
import { isString } from 'lodash';

export const extractHostname = (input: string | Request): string => {
    const extract = (host: string): string => {
        const protocol = 'https://';
        const pattern = new RegExp(/https?:\/\//g);
        const includes = pattern.test(host);
        const draft = !includes ? protocol + host : host;
        const url = new URL(draft);
        return url.hostname
    };

    if(!isString(input)) {
        const { headers, hostname } = input;
        const outer = headers.host || headers['x-request-host'];
        const host = isString(outer) && Boolean(outer.length) ? outer : hostname;
        return extract(host);
    }

    if(input === '*') {
        return input;
    }

    return extract(input);
}

export const domainComparator = (current: string, required: string): boolean => (
    extractHostname(current) === extractHostname(required)
);

export const domainRestrictionGuard: Guard = (predicate: string) => (
    <T extends Record<string, any>>({ domainName }: T): boolean => {

        return [
            domainComparator(predicate, domainName),
            domainName === '*'
        ].some(Boolean);
    }
);
