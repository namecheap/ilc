const { expect } = require('chai');

describe('Tests /api/v1/config', () => {
    describe('Read', () => {
        it('should successfully return config', async () => {
            const response = await request.get('/api/v1/config')
            .expect(200);

            expect(response.text).to.be.a('string');
            expect(response.body).deep.equal({});

            const parsedJSON = JSON.parse(response.text);
            expect(parsedJSON).to.be.an('object');

            expect(parsedJSON.apps).to.be.an('object');
            expect(parsedJSON.templates).to.be.an('object');
            expect(parsedJSON.routes).to.be.an('array');
            expect(parsedJSON.specialRoutes).to.be.an('object');
        })
    });
});
