import { request, expect } from './common';

describe('Tests /', () => {
    it('Hello world', async () => {
        const response = await request.get('/');
        expect(response.text).to.contain(' <title>React Admin</title>');
    });
});
