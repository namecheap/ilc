import { stringify } from 'querystring';

export function makeFilterQuery(params: Record<string, any>) {
    return stringify({ filter: JSON.stringify(params) });
}
