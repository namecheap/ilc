import Tailor from '@namecheap/tailorx';

/**
 * The typed seam for @namecheap/tailorx@8.2.1.
 *
 * The index.d.ts published with the package still describes upstream zalando/tailor's
 * constructor: it omits eight options the fork consumes (processFragmentResponse, the
 * filterHeaders alias, fragmentHooks, botsGuardEnabled, getAssetsToPreload,
 * baseTemplatesCacheSize, shouldSetPrimaryFragmentAssetsToPreload, fetchContext's real
 * shape), documents three it no longer reads (amdLoaderUrl, pipeInstanceName,
 * pipeAttributes), and mistypes requestFragment (`url: Url`, `Promise<ServerResponse>`)
 * and filterResponseHeaders (its second argument is a headers object, not a ServerResponse).
 *
 * TailorOptions is derived from the package source (index.js constructor,
 * lib/request-handler.js, lib/fragment.js, lib/request-fragment.js) and pins what the
 * contract actually fixes: option names, callback arity and return types, scalar option
 * types. Callback request/attributes parameters are `any` on purpose — tailorx passes
 * them through untouched, and each handler declares the precise slice it consumes at its
 * own definition (e.g. request-fragment.ts's FragmentRequestContext).
 *
 * The lasting fix is correcting index.d.ts upstream in namecheap/tailorx; when that
 * ships, reduce this file to a plain re-export.
 */
export interface TailorOptions {
    /** lib/request-handler.js — called once per request with the live (ILC-patched) IncomingMessage; default resolves {} */
    fetchContext?: (request: any) => Promise<object>;
    /** lib/request-handler.js — called as fetchTemplate(request, parseTemplate); default serves from templatesPath */
    fetchTemplate?: (request: any, parseTemplate: any) => Promise<unknown>;
    /** index.js:17 — canonical name for the request-header filter */
    filterRequestHeaders?: (attributes: any, request: any) => object;
    /** index.js:17 — accepted alias for filterRequestHeaders */
    filterHeaders?: (attributes: any, request: any) => object;
    /** lib/request-fragment.js:74 — called as processFragmentResponse(response, { request, fragmentUrl, fragmentAttributes }) */
    processFragmentResponse?: (response: any, context: any) => unknown;
    /** lib/fragment.js:157 — called as requestFragment(url, attributes, request, span) */
    requestFragment?: (url: string, attributes: any, request: any, span?: unknown) => Promise<unknown>;
    /** lib/request-handler.js:146 — second argument is the fragment's response-headers object */
    filterResponseHeaders?: (attributes: any, headers: any) => object;
    /** index.js — default 'fragment' */
    fragmentTag?: string;
    /** lib/parse-template.js */
    handledTags?: string[];
    /** lib/process-template.js — serializes custom tags */
    handleTag?: (request: any, tag: any, options: any, context: any) => unknown;
    /** index.js — clamped to >= 1, default 1 */
    maxAssetLinks?: number;
    /** lib/fetch-template.js — default path.join(process.cwd(), 'templates') */
    templatesPath?: string;
    /** lib/tracing.js — opentracing-compliant tracer */
    tracer?: unknown;
    /** lib/parse-template.js — default 0 */
    baseTemplatesCacheSize?: number;
    /** lib/request-handler.js — default false */
    botsGuardEnabled?: boolean;
    /** lib/fragment.js:254,282 — insertStart/insertEnd(stream, attributes, headers, index); default {} */
    fragmentHooks?: {
        insertStart?: (stream: any, attributes: any, headers: any, index: any) => void;
        insertEnd?: (stream: any, attributes: any, headers: any, index: any) => void;
    };
    /** lib/request-handler.js:155 — read as configAssets.styleRefs || [], so members may be omitted */
    getAssetsToPreload?: (request: any) => Promise<{ styleRefs?: string[]; scriptRefs?: string[] }>;
    /** lib/request-handler.js:162 — default true */
    shouldSetPrimaryFragmentAssetsToPreload?: boolean;
}

/**
 * The one deliberate assertion in the tailorx integration: the shipped constructor type
 * is wrong (see above), so the source-verified one is asserted here — once — and every
 * construction site gets a checked options object.
 */
export default Tailor as unknown as new (options?: TailorOptions) => InstanceType<typeof Tailor>;
