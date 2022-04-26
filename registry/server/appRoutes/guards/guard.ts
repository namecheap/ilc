export type Guard = (...args: Array<any>) => (
    <K extends Record<string, any>>(inc: K) => boolean
);
