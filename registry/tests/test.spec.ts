import { request, expect } from './common';

describe('Tests /', () => {
    it('Hello world', async () => {
        const response = await request().then((r) => r.get('/'));
        expect(response.text).to.contain('<title>ILC Registry</title>');
    });

    it('should respond to health check ping', async () => {
        const response = await request().then((r) => r.get('/ping').expect(200));
        expect(response.text).to.equal('pong');
    });
});
