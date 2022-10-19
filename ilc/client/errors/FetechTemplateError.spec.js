import { expect } from 'chai';
import { FetchTemplateError } from './FetchTemplateError';

describe('FetchTemplateError', () => {
    it('should have correct code', () => {
        const error = new FetchTemplateError();
        expect(error.code).to.be.equal('internal.fetchTemplate');
    });

    it('should have errorId', () => {
        const error = new FetchTemplateError();
        expect(error.errorId).to.be.a('string');
    });
});
