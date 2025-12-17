import { isFastifyRequest, PatchedFastifyRequest, PatchedHttpRequest } from './PatchedHttpRequest';

interface IlcRequestExtras {
    getLocale(): string | undefined;
    getHostName(): string | undefined;
    isLde(): boolean;
}

export type IlcRequest = IlcRequestExtras & (PatchedFastifyRequest | PatchedHttpRequest);

export function ilcRequestDecorator(req: PatchedFastifyRequest | PatchedHttpRequest): IlcRequest {
    const extras: IlcRequestExtras = {
        getLocale() {
            return isFastifyRequest(req) ? req.raw.ilcState?.locale : req.ilcState?.locale;
        },
        getHostName() {
            return isFastifyRequest(req) ? req.host : req.headers.host;
        },
        isLde() {
            return Boolean(isFastifyRequest(req) ? req.raw.ldeRelated : req.ldeRelated);
        },
    };

    Object.assign(req as any, extras);
    return req as IlcRequest;
}
