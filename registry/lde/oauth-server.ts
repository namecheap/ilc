import { OAuth2Server } from 'oauth2-mock-server';

(async function main() {
    try {
        const server = new OAuth2Server();
        // Generate a new RSA key and add it to the keystore
        await server.issuer.keys.generate('RS256');

        // Start the server
        await server.start(8080);
        console.log('Issuer URL:', server.issuer.url); // -> http://localhost:8080

        server.service.on('beforeTokenSigning', (token, req) => {
            token.payload.unique_name = 'root';
        });
    } catch (error) {
        console.error(error);
    }
})();
