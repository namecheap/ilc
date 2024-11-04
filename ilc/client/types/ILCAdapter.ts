export interface ILCAdapter {
    mount: (...args: any[]) => Promise<any>;
    unmount: (...args: any[]) => Promise<any>;
    bootstrap: (...args: any[]) => Promise<any>;
    update?: (...args: any[]) => Promise<any>;
    createNew?: (...args: any[]) => Promise<any>;
}
