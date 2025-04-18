import waitOn from 'wait-on';

const appPorts = {
    ilc: 8233,
    registry: 4001,
    navigation: 8235,
    people: 8236,
    planets: 8237,
    fetchWithCache: 8238,
    news: 8239,
    system: 8240,
    wrapper: 8234,
};

const resources = [
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.navigation}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.people}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.planets}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.news}/_spa/dev/assets-discovery`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.system}/index.js`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.fetchWithCache}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.ilc}/ping`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.registry}/ping`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.wrapper}/client-entry.js`,
];

async function logHttpResponse(url: string) {
    try {
        const response = await fetch(url);
        console.log(`[DEBUG] ${url} responded with status ${response.status}`);
        console.log(`[DEBUG] Response body:`, response.body);
    } catch (err: any) {
        if (err.response) {
            console.error(`[ERROR] ${url} responded with status ${err.response.status}`);
            console.error(`[ERROR] Response body:`, err.response.data);
        } else {
            console.error(`[ERROR] Could not reach ${url}:`, err.message);
        }
    }
}

export async function bootstrap() {
    try {
        await new Promise((resolve, reject) => {
            waitOn({
                resources,
                timeout: 10 * 60 * 1000,
                interval: 1000,
                verbose: true,
            })
                .then(resolve)
                .catch(async (err) => {
                    console.log(err);
                    reject(err);
                });
        });
    } catch (error) {
        console.error('Error during bootstrap...');
        console.error(error);
        process.exit(1);
    }
}
