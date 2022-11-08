import { request, expect } from './common';

describe('Tests /', () => {
    it('Hello world', async () => {
        const response = await request().then((r) => r.get('/'));
        expect(response.text).to.contain('<title>ILC Registry</title>');
    });
});
