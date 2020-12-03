import * as Knex from 'knex';

const publicHost = process.env.PUBLIC_HOST || 'localhost';

export async function seed(knex: Knex): Promise<any> {
    return knex("apps").insert([
        {
            name: '@portal/navbar',
            spaBundle: `http://${publicHost}:8235/navbar.js`,
            dependencies: JSON.stringify({
                react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
                'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
            }),
            ssr: JSON.stringify({
                src: 'http://localhost:8235/',
                timeout: 1000,
            }),
            props: JSON.stringify({
                publicPath: `http://${publicHost}:8235/`
            }),
            kind: 'essential',
        }, {
            name: '@portal/people',
            spaBundle: `http://${publicHost}:8236/people.js`,
            dependencies: JSON.stringify({
                react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
                'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
                rxjs: 'https://unpkg.com/rxjs@6.4.0/bundles/rxjs.umd.js',
                '@portal/fetchWithCache': `http://${publicHost}:8238/fetchWithCache.js`,
            }),
            props: JSON.stringify({
                publicPath: `http://${publicHost}:8236/`
            }),
            kind: 'primary',
        }, {
            name: '@portal/planets',
            spaBundle: `http://${publicHost}:8237/planets.js`,
            dependencies: JSON.stringify({
                '@portal/fetchWithCache': `http://${publicHost}:8238/fetchWithCache.js`,
            }),
            props: '{}',
            kind: 'primary',
        }, {
            name: '@portal/news',
            spaBundle: `http://${publicHost}:8239/dist/single_spa.js`,
            cssBundle: `http://${publicHost}:8239/dist/common.21f11a2afc03af3d62f8.css`,
            ssr: JSON.stringify({
                src: "http://localhost:8239/news/?fragment=1",
                timeout: 5000,
            }),
            assetsDiscoveryUrl: 'http://127.0.0.1:8239/_spa/dev/assets-discovery',
            dependencies: '{}',
            props: JSON.stringify({
                publicPath: `http://${publicHost}:8239/dist/`
            }),
            kind: 'primary',
        }, {
            name: '@portal/system',
            spaBundle: `http://${publicHost}:8240/index.js`,
            ssr: JSON.stringify({
                src: "http://127.0.0.1:8240/fragment",
                timeout: 1000,
            }),
            dependencies: '{}',
            props: '{}',
            kind: 'primary',
        }, {
            name: '@portal/fetchWithCache',
            spaBundle: `http://${publicHost}:8238/fetchWithCache.js`,
            dependencies: '{}',
            props: '{}',
            kind: 'essential',
        },
    ]);
}
