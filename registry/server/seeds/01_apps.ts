import * as Knex from "knex";

export async function seed(knex: Knex): Promise<any> {
    // Deletes ALL existing entries
    return knex("apps").del()
        .then(() => {
            // Inserts seed entries
            return knex("apps").insert([
                {
                    name: '@portal/navbar',
                    spaBundle: 'http://localhost:8235/navbar.js',
                    dependencies: JSON.stringify({
                        react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
                        'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
                    }),
                    ssr: JSON.stringify({
                        src: 'http://localhost:9235/',
                        timeout: 1000,
                    }),
                    initProps: '{}',
                    props: '{}',
                    kind: 'essential',
                }, {
                    name: '@portal/people',
                    spaBundle: 'http://localhost:8236/people.js',
                    dependencies: JSON.stringify({
                        react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
                        'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
                        rxjs: 'https://unpkg.com/rxjs@6.4.0/bundles/rxjs.umd.js',
                        '@portal/fetchWithCache': 'http://localhost:8238/fetchWithCache.js',
                    }),
                    initProps: '{}',
                    props: '{}',
                    kind: 'primary',
                }, {
                    name: '@portal/planets',
                    spaBundle: 'http://localhost:8237/planets.js',
                    dependencies: JSON.stringify({
                        '@portal/fetchWithCache': 'http://localhost:8238/fetchWithCache.js',
                    }),
                    initProps: '{}',
                    props: '{}',
                    kind: 'primary',
                }, {
                    name: '@portal/news',
                    spaBundle: 'http://127.0.0.1:3000/dist/single_spa.js',
                    cssBundle: 'http://127.0.0.1:3000/dist/common.21f11a2afc03af3d62f8.css',
                    ssr: JSON.stringify({
                        src: "http://localhost:3000/news/?fragment=1",
                        timeout: 1000,
                    }),
                    assetsDiscoveryUrl: 'http://127.0.0.1:3000/_spa/dev/assets-discovery',
                    dependencies: '{}',
                    initProps: '{}',
                    props: '{}',
                    kind: 'primary',
                }, {
                    name: '@portal/system',
                    spaBundle: 'http://127.0.0.1:8240/index.js',
                    ssr: JSON.stringify({
                        src: "http://127.0.0.1:8240/fragment",
                        timeout: 1000,
                    }),
                    dependencies: '{}',
                    initProps: '{}',
                    props: '{}',
                    kind: 'primary',
                }, {
                    name: '@portal/fetchWithCache',
                    spaBundle: 'http://localhost:8238/fetchWithCache.js',
                    dependencies: '{}',
                    initProps: '{}',
                    props: '{}',
                    kind: 'essential',
                },
            ]);
        });
}
