import { expect } from 'chai';
import { extendError } from './extendError';

function stackHeadlines(error: Error): string[] {
    return error.stack?.match(/^\S.*$/gm) ?? [];
}

describe('extendError', () => {
    it('should put the cause stack first and the error stack last', () => {
        const WrapperError = extendError('WrapperError');

        const error = new WrapperError({ message: 'wrapper', cause: new Error('root') });

        expect(stackHeadlines(error)).to.deep.equal(['Caused by: Error: root', 'WrapperError: wrapper']);
    });

    it('should not let the caller turn the inverse order off', () => {
        const WrapperError = extendError('WrapperError', { inverse: false });

        const error = new WrapperError({ message: 'wrapper', cause: new Error('root') });

        expect(stackHeadlines(error)).to.deep.equal(['Caused by: Error: root', 'WrapperError: wrapper']);
    });

    it('should pass the other options through', () => {
        const ParentError = extendError('ParentError');
        const ChildError = extendError<{ a: number }>('ChildError', {
            parent: ParentError,
            defaultMessage: 'child default',
            defaultData: { a: 1 },
        });

        const error = new ChildError();

        expect(error).to.be.instanceOf(ChildError);
        expect(error).to.be.instanceOf(ParentError);
        expect(error).to.be.instanceOf(Error);
        expect(error.name).to.equal('ChildError');
        expect(error.message).to.equal('child default');
        expect(error.data).to.deep.equal({ a: 1 });
    });
});
