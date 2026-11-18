import { expect } from 'chai';
import type { NextFunction, Request, Response } from 'express';
import sinon from 'sinon';
import { OAuthScope } from '../oauth/interfaces';
import { registryApiScope, scopesMiddlewareFactory } from './scopesMiddleware';

function run(middleware: ReturnType<typeof scopesMiddlewareFactory>, req: Partial<Request>) {
    const send = sinon.stub();
    const status = sinon.stub().returns({ send });
    const set = sinon.stub();
    const next = sinon.stub();
    middleware(req as Request, { status, set } as unknown as Response, next as unknown as NextFunction);
    return { status, send, set, next };
}

describe('scopesMiddleware', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 1).toISOString();

    it('maps GET to registry:read and the other methods to registry:write', () => {
        expect(registryApiScope({ method: 'GET' } as Request)).to.equal(OAuthScope.RegistryRead);
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
            expect(registryApiScope({ method } as Request)).to.equal(OAuthScope.RegistryWrite);
        }
    });

    it('passes a request without a scoped session', () => {
        const { next, status } = run(scopesMiddlewareFactory(OAuthScope.OverrideSign), {});
        expect(next.calledOnce).to.be.true;
        expect(status.called).to.be.false;
    });

    it('passes a scoped session that has the scope', () => {
        const middleware = scopesMiddlewareFactory(registryApiScope);
        const scopedSession = { scopes: [OAuthScope.RegistryRead], absoluteExpiresAt: future, client: 'c' };
        const { next } = run(middleware, { method: 'GET', scopedSession });
        expect(next.calledOnce).to.be.true;
    });

    it('answers 403 naming the missing scope', () => {
        const middleware = scopesMiddlewareFactory(registryApiScope);
        const scopedSession = { scopes: [OAuthScope.RegistryRead], absoluteExpiresAt: future, client: 'c' };
        const { next, status, send, set } = run(middleware, { method: 'POST', scopedSession });
        expect(next.called).to.be.false;
        expect(status.calledOnceWith(403)).to.be.true;
        expect(send.firstCall.args[0].message).to.include('"registry:write" is required');
        // RFC 6750 section 3.1
        expect(set.calledOnceWith('WWW-Authenticate', 'Bearer error="insufficient_scope", scope="registry:write"')).to
            .be.true;
    });

    it('answers 401 once the absolute expiry has passed, scope or not', () => {
        const middleware = scopesMiddlewareFactory(OAuthScope.OverrideSign);
        const scopedSession = { scopes: [OAuthScope.OverrideSign], absoluteExpiresAt: past, client: 'c' };
        const { next, status, set } = run(middleware, { method: 'POST', scopedSession });
        expect(next.called).to.be.false;
        expect(status.calledOnceWith(401)).to.be.true;
        expect(set.firstCall.args[1]).to.include('error="invalid_token"');
    });
});
