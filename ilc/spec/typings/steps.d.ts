/// <reference types='codeceptjs' />

declare namespace CodeceptJS {
    class MockRequestHelper {
        mockServer(callback: (server: any) => void): void;
        mockRequest(method: string, path: string | Array<string>, status: number, data?: any): void;
        startMocking(): void;
        stopMocking(): void;
    }

    interface SupportObject { I: CodeceptJS.I }
    interface CallbackOrder { [0]: CodeceptJS.I }
    interface Methods extends CodeceptJS.Puppeteer, MockRequestHelper { }
    interface I extends WithTranslation<Methods> { }
    namespace Translation {
        interface Actions { }
    }
}
