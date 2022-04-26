import { Guard } from "./guard";

export const extractHost = (domain: string): string => {
    if(domain === '*') {
        return domain;
    }

    const protocol = 'http://';
    const includes = domain.includes(protocol);
    const draft = !includes ? protocol + domain : domain;
    const url = new URL(draft);

    return url.hostname;
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
