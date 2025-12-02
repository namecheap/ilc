import type * as express from 'express';
import {
    Strategy as OIDCStrategy,
    type VerifyFunction,
    type StrategyOptions,
    AuthenticateOptions,
} from 'openid-client/passport';

/**
 * Custom OIDC Strategy that extends openid-client v6 Strategy
 * to support response_mode configuration
 */
export class CustomOIDCStrategy extends OIDCStrategy {
    constructor(
        options: StrategyOptions,
        verify: VerifyFunction,
        private readonly responseMode?: string,
    ) {
        super(options, verify);
    }

    /**
     * Override authorizationRequestParams to inject response_mode
     */
    authorizationRequestParams(
        req: express.Request,
        options: AuthenticateOptions,
    ): URLSearchParams | Record<string, string> | undefined {
        const params = super.authorizationRequestParams(req, options) || {};

        // Convert URLSearchParams to object if needed
        const paramsObj = params instanceof URLSearchParams ? Object.fromEntries(params.entries()) : params;

        // Add response_mode if configured
        if (this.responseMode) {
            return {
                ...paramsObj,
                response_mode: this.responseMode,
            };
        }

        return paramsObj;
    }
}
