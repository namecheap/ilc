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

export interface CommonApp {
    name: string,
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
    name: string,
    spaBundle: string,
    cssBundle: string,
    dependencies: string,
    ssr: string,
    initProps: string,
    props: string,
    assetsDiscoveryUrl?: string,
    assetsDiscoveryUpdatedAt?: number,
}
