import { request, expect } from './common.spec';

describe('Tests /', () => {
    it('Hello world', async () => {
        const response = await request.get('/');
        expect(response.text).to.be.equal('Hello! This is Micro Fragments registry service.');
    });
});
