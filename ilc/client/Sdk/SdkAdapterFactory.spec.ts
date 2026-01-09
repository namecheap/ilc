import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import { SdkAdapterFactory } from './SdkAdapterFactory';

interface MockI18n {
    getAdapter: SinonStub;
}

interface MockRouter {
    render404: SinonSpy;
}

describe('SdkAdapterFactory', () => {
    let mockI18n: MockI18n;
    let mockRouter: MockRouter;
    let mockIntlAdapter: any;

    beforeEach(() => {
        mockIntlAdapter = {
            locale: 'en-US',
            currency: 'USD',
        };

        mockI18n = {
            getAdapter: sinon.stub().returns(mockIntlAdapter),
        };

        mockRouter = {
            render404: sinon.spy(),
        };
    });

    afterEach(() => {
        sinon.resetHistory();
    });

    describe('constructor', () => {
        it('should create an instance with i18n and router', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            expect(factory).to.be.instanceOf(SdkAdapterFactory);
        });

        it('should create an instance with null i18n', () => {
            const factory = new SdkAdapterFactory(null, mockRouter);
            expect(factory).to.be.instanceOf(SdkAdapterFactory);
        });

        it('should create an instance with undefined i18n', () => {
            const factory = new SdkAdapterFactory(undefined, mockRouter);
            expect(factory).to.be.instanceOf(SdkAdapterFactory);
        });
    });

    describe('getSdkAdapter', () => {
        it('should return SDK adapter with correct appId', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);

            expect(adapter).to.have.property('appId', appId);
        });

        it('should return SDK adapter with intl adapter when i18n exists', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);

            expect(mockI18n.getAdapter.calledOnce).to.be.true;
            expect(adapter.intl).to.equal(mockIntlAdapter);
        });

        it('should return SDK adapter with undefined intl when i18n is null', () => {
            const factory = new SdkAdapterFactory(null, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);

            expect(adapter.intl).to.be.undefined;
        });

        it('should return SDK adapter with undefined intl when i18n is undefined', () => {
            const factory = new SdkAdapterFactory(undefined, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);

            expect(adapter.intl).to.be.undefined;
        });

        it('should return SDK adapter with trigger404Page function', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);

            expect(adapter).to.have.property('trigger404Page');
            expect(adapter.trigger404Page).to.be.a('function');
        });

        it('should create separate adapters for different appIds', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId1 = 'app1__at__slot1';
            const appId2 = 'app2__at__slot2';

            const adapter1 = factory.getSdkAdapter(appId1);
            const adapter2 = factory.getSdkAdapter(appId2);

            expect(adapter1.appId).to.equal(appId1);
            expect(adapter2.appId).to.equal(appId2);
            expect(adapter1).to.not.equal(adapter2);
        });
    });

    describe('trigger404Page', () => {
        it('should call router.render404 when withCustomContent is false', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page(false);

            expect(mockRouter.render404.calledOnce).to.be.true;
            expect(mockRouter.render404.calledWith({ detail: { appId } })).to.be.true;
        });

        it('should call router.render404 when withCustomContent is not provided', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page();

            expect(mockRouter.render404.calledOnce).to.be.true;
            expect(mockRouter.render404.calledWith({ detail: { appId } })).to.be.true;
        });

        it('should NOT call router.render404 when withCustomContent is true', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page(true);

            expect(mockRouter.render404.called).to.be.false;
        });

        it('should call router.render404 with correct appId for multiple apps', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId1 = 'app1__at__slot1';
            const appId2 = 'app2__at__slot2';

            const adapter1 = factory.getSdkAdapter(appId1);
            const adapter2 = factory.getSdkAdapter(appId2);

            adapter1.trigger404Page(false);
            expect(mockRouter.render404.calledWith({ detail: { appId: appId1 } })).to.be.true;

            mockRouter.render404.resetHistory();

            adapter2.trigger404Page(false);
            expect(mockRouter.render404.calledWith({ detail: { appId: appId2 } })).to.be.true;
        });

        it('should handle undefined withCustomContent as falsy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page(undefined);

            expect(mockRouter.render404.calledOnce).to.be.true;
        });

        it('should handle null withCustomContent as falsy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page(null);

            expect(mockRouter.render404.calledOnce).to.be.true;
        });

        it('should handle 0 withCustomContent as falsy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page(0);

            expect(mockRouter.render404.calledOnce).to.be.true;
        });

        it('should handle empty string withCustomContent as falsy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page('');

            expect(mockRouter.render404.calledOnce).to.be.true;
        });

        it('should handle non-empty string withCustomContent as truthy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page('custom content');

            expect(mockRouter.render404.called).to.be.false;
        });

        it('should handle object withCustomContent as truthy', () => {
            const factory = new SdkAdapterFactory(mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = factory.getSdkAdapter(appId);
            adapter.trigger404Page({ custom: 'content' });

            expect(mockRouter.render404.called).to.be.false;
        });
    });
});
