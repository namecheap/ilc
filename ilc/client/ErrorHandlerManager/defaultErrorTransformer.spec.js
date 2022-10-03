import chai from 'chai';
import defaultErrorTransformer from 'defaultErrorTransformer';

describe('default error transformer', () => {
    const registryConfig = {
        apps: {
            '@portal/test-first': {
                spaBundle: 'https://localhost:8080/first.js',
                cssBundle: 'https://localhost:8080/first.css',
                kind: 'primary'
            },
            '@portal/test-second': {
                spaBundle: 'https://localhost:8080/second.js',
                cssBundle: 'https://localhost:8080/second.css',
                kind: 'primary'
            },
        },
        routes: [],
        specialRoutes: {},
        settings: {},
        sharedLibs: {
            testLib: 'https://localhost:8080/test-lib.js',
        }
    };

    const baseErrorInfo = {
        type: 'MODULE_ERROR',
        errorId: 'b4e29e50-1775-4323-a642-07f3a2fa5eb7', 
    };

    it('should not transform error', () => {
        const error = new Error('Test error');

        const transformResult = defaultErrorTransformer({
            error,
            errorInfo: {
                ...baseErrorInfo,
            },
            config: registryConfig,
        });

        chai.expect(transformResult.error).to.be.eql(error);
    });

    it('should transform dependants', () => {
        const { errorInfo } = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [
                    'https://localhost:8080/first.js',
                    'https://localhost:8080/second.js',
                    'https://localhost:8080/test-lib.js',
                    'https://localhost:8080/unexistent.js',
                ],
            },
            config: registryConfig,
        });
        
        chai.expect(errorInfo.dependants).to.be.eql([
            '@portal/test-first',
            '@portal/test-second',
            'testLib',
            'https://localhost:8080/unexistent.js',
        ]);
    });

    it('should transform src to appName if src is application bundle', () => {
        const { errorInfo } = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [],
                src: 'https://localhost:8080/first.js',
            },
            config: registryConfig,
        });

        chai.expect(errorInfo.appName).to.be.eql('@portal/test-first');
    });

    it('should drop src if src is not application bundle', () => {
        const { errorInfo } = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [],
                src: 'https://localhost:8080/random.js',
            },
            config: registryConfig,
        });

        chai.expect(errorInfo.src).to.be.eql(undefined);
    });

    it('should transform name to appName if src is not defined and name is application name', () => {
        const { errorInfo } = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [],
                name: '@portal/test-first',
            },
            config: registryConfig,
        });

        chai.expect(errorInfo.appName).to.be.eql('@portal/test-first');
    });

    it('should not transform name to appName if name is not application name', () => {
        let transformResult = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [],
                name: 'testLib',
            },
            config: registryConfig,
        });

        chai.expect(transformResult.errorInfo.name).to.be.eql('testLib');
        chai.expect(transformResult.errorInfo.appName).to.be.eql(undefined);

        transformResult = defaultErrorTransformer({
            error: new Error('Test error'),
            errorInfo: {
                ...baseErrorInfo,
                dependants: [],
                name: 'random',
            },
            config: registryConfig,
        });

        chai.expect(transformResult.errorInfo.name).to.be.eql('random');
        chai.expect(transformResult.errorInfo.appName).to.be.eql(undefined);
    });
});
