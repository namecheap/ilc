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

export default interface App {
    name: string,
    spaBundle: string,
    cssBundle: string,
    dependencies: string,
    ssr: string,
    initProps: string,
    props: string,
    assetsDiscoveryUrl?: string,
    assetsDiscoveryUpdatedAt: number,
}
