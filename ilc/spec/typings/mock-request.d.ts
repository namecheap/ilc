declare module "@codeceptjs/mock-request" {
    class MockRequestHelper {
        mockServer(callback: (server: any) => void): void;
        mockRequest(method: string, path: string | Array<string>, status: number, data?: any): void;
        startMocking(): void;
        stopMocking(): void;
    }

    export = MockRequestHelper
}
