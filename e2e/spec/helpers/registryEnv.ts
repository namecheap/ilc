export const registryUrl = process.env.REGISTRY_URL ?? 'http://localhost:4001';

// Local users seeded by the Registry migrations
export const registryUsers = {
    admin: {
        username: process.env.REGISTRY_ADMIN_USERNAME ?? 'root',
        password: process.env.REGISTRY_ADMIN_PASSWORD ?? 'pwd',
    },
    readonly: {
        username: process.env.REGISTRY_READONLY_USERNAME ?? 'readonly',
        password: process.env.REGISTRY_READONLY_PASSWORD ?? 'pwd',
    },
};

// Bearer token seeded by the Registry migrations, used to prepare and clean up data over the API
export const registryApiToken = {
    id: process.env.REGISTRY_API_TOKEN_ID ?? 'root_api_token',
    secret: process.env.REGISTRY_API_TOKEN_SECRET ?? 'token_secret',
};

// Local OAuth mock server started with the Registry (registry/lde/oauth-server.ts). It approves every
// authorization request and puts "root" into the "unique_name" claim.
export const openIdIssuerUrl = process.env.REGISTRY_OPENID_ISSUER_URL ?? 'http://localhost:8085';
