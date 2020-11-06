declare module '@namecheap/error-extender' {
    interface ExtendedErrorConstructConfig<DataType> {
        message?: string;
        m?: string;
        data?: Partial<DataType>;
        d?: Partial<DataType>;
        cause?: Error;
        c?: Error;
    }

    export interface ExtendedError<DataType = any> extends Error {
        new (config?: ExtendedErrorConstructConfig<DataType>): ExtendedError<DataType>;
        data: DataType;
        cause: Error | ExtendedError;
    }

    interface ExtendConfig<DataType> {
        defaultMessage?: string;
        defaultData?: DataType;
        parent?: Error;
    }

    export default function <DataType = any>(errType: string, config?: ExtendConfig<DataType>): ExtendedError<DataType>;
}
