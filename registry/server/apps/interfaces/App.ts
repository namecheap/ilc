export interface AppDependencies {
    [packageName: string]: string
}

export interface AppSSR {
    src: string,
    timeout: number,
    primary: boolean,
}

export interface AppInitProps {
    [propName: string]: any
}

export interface AppProps {
    [propName: string]: any,
}

export type AppName = string;

export interface CommonApp {
    name: AppName,
    spaBundle: string,
    cssBundle: string,
    assetsDiscoveryUrl?: string,
}

export interface AppBody extends CommonApp {
    dependencies?: AppDependencies,
    props?: AppProps,
    ssr: AppSSR,
    initProps?: AppInitProps,
}

export default interface App extends CommonApp {
    dependencies: string,
    ssr: string,
    initProps: string,
    props: string,
    assetsDiscoveryUpdatedAt?: number,
}
