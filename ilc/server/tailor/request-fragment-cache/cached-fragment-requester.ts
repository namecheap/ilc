import { setCacheMarker } from './marker';
import { composeCacheKey, explainOptInRefusal, explainRequestRefusal } from './utils/policy';
import { pickSharedRenderHeaders } from '../fragment-render';
import { Fragment404Response } from '../errors';
import { appIdToNameAndSlot } from '../../../common/utils';
import type { CacheEnabledAttributes } from './types/fragment';
import type {
    CacheableFragmentAttributes,
    FragmentRequest,
    FragmentResponse,
    RequestFragment,
} from './../fragment-render';
import type { FragmentCacheErrorSource, FragmentCacheEvent, FragmentCacheSource } from './types/events';
import type { RefusalReason } from './types/refusal';
import type { FragmentResponseCache } from './response-cache';
import type { CachedFragmentRequesterDeps, FragmentCacheDeps } from './types/deps';

const RENDER_DEADLINE_SLACK_MS = 5000;
const DEFAULT_FRAGMENT_TIMEOUT_MS = 3000;

export class CachedFragmentRequester {
    private readonly onCacheEvent: NonNullable<FragmentCacheDeps['onCacheEvent']>;

    constructor(
        private readonly requestFragment: RequestFragment,
        private readonly cache: FragmentResponseCache,
        private readonly deps: CachedFragmentRequesterDeps,
    ) {
        this.onCacheEvent = deps.onCacheEvent ?? (() => {});
    }

    handle(fragmentUrl: string, attributes: CacheableFragmentAttributes, request: FragmentRequest) {
        // checked before anything touches request.router: an LDE request may arrive without one
        if (request?.ldeRelated === true) {
            return this.refuseWithPrivateRender(fragmentUrl, attributes, request, 'lde-request');
        }

        // a fragment that never opted in is answered without resolving the route: no reason to
        // do the work before deciding it is needed, and it keeps the uncached path untouched
        if (explainOptInRefusal(attributes) !== null) {
            return this.renderPrivate(fragmentUrl, attributes, request);
        }

        const route = request.router.getRoute();
        const varyHeaders = pickSharedRenderHeaders(request.headers);
        const refusal = explainRequestRefusal(attributes, route, varyHeaders);

        if (refusal !== null) {
            return this.refuseWithPrivateRender(fragmentUrl, attributes, request, refusal);
        }
        // a null refusal is exactly the condition isCacheableRequest asserts
        return this.requestCached(fragmentUrl, attributes as CacheEnabledAttributes, request, route, varyHeaders);
    }

    private async requestCached(
        fragmentUrl: string,
        attributes: CacheEnabledAttributes,
        request: FragmentRequest,
        route: ReturnType<FragmentRequest['router']['getRoute']>,
        varyHeaders: ReturnType<typeof pickSharedRenderHeaders>,
    ): Promise<FragmentResponse> {
        const { appName } = appIdToNameAndSlot(attributes.id ?? '');
        const key = composeCacheKey({
            fragmentUrl,
            attributes,
            route,
            varyHeaders,
            l10nManifest: request.registryConfig.apps[appName]?.l10nManifest,
        });

        try {
            const outcome = await this.cache.get(key, {
                ttlSeconds: attributes.cache.ttlSeconds,
                timeoutMs: this.renderTimeoutMs(attributes),
                load: () => this.renderShared(fragmentUrl, attributes, request, varyHeaders),
            });

            if (outcome.source === 'refuse') {
                return this.refuseWithPrivateRender(fragmentUrl, attributes, request, outcome.reason);
            }

            this.recordOutcome(attributes, outcome.source);
            return outcome.response;
        } catch (error) {
            if (!(error instanceof Fragment404Response)) {
                const isLikelyProgrammerError =
                    error instanceof TypeError || error instanceof RangeError || error instanceof ReferenceError;
                const source: FragmentCacheErrorSource = isLikelyProgrammerError ? 'cache-internal' : 'fragment';
                this.emit('error', attributes, { source });
            }
            throw error;
        }
    }

    private refuseWithPrivateRender(
        fragmentUrl: string,
        attributes: CacheableFragmentAttributes,
        request: FragmentRequest,
        reason: RefusalReason,
    ) {
        this.recordRefusal(attributes, reason);
        return this.renderPrivate(fragmentUrl, attributes, request);
    }

    /**
     * Reports a refusal — except for a fragment that never opted in, which is not a refusal at all
     * and would put an event on nearly every render in the fleet.
     */
    private recordRefusal(attributes: CacheableFragmentAttributes, reason: RefusalReason): void {
        if (explainOptInRefusal(attributes) !== null) {
            return;
        }
        this.recordOutcome(attributes, 'refuse', { reason });
    }

    /** The pairing every reportable outcome needs: log/metric it, then mark it in the HTML. */
    private recordOutcome(
        attributes: CacheableFragmentAttributes,
        event: FragmentCacheSource | 'refuse',
        qualifier: { reason?: RefusalReason } = {},
    ): void {
        this.emit(event, attributes, qualifier);
        setCacheMarker(attributes, qualifier.reason ? `refuse:${qualifier.reason}` : event);
    }

    private renderPrivate(fragmentUrl: string, attributes: CacheableFragmentAttributes, request: FragmentRequest) {
        return this.requestFragment(fragmentUrl, attributes, request);
    }

    private renderShared(
        fragmentUrl: string,
        attributes: CacheableFragmentAttributes,
        request: FragmentRequest,
        varyHeaders: ReturnType<typeof pickSharedRenderHeaders>,
    ): Promise<FragmentResponse> {
        return this.requestFragment(fragmentUrl, attributes, request, { mode: 'shared', varyHeaders });
    }

    private renderTimeoutMs(attributes: CacheableFragmentAttributes): number {
        const timeoutMs =
            typeof attributes.timeout === 'number' && attributes.timeout > 0
                ? attributes.timeout
                : DEFAULT_FRAGMENT_TIMEOUT_MS;
        return timeoutMs + RENDER_DEADLINE_SLACK_MS;
    }

    private emit(
        event: FragmentCacheEvent,
        attributes: CacheableFragmentAttributes,
        qualifier: { source?: FragmentCacheErrorSource; reason?: RefusalReason } = {},
    ): void {
        const appId = attributes.id ?? 'unknown';
        this.deps.logger.info({ event, appId, ...qualifier }, '[ILC Cache]: Fragment cache decision');
        this.onCacheEvent(event, { appId, ...qualifier });
    }
}
