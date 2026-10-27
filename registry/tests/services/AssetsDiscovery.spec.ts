import AssetsDiscovery from '../../server/common/services/assets/AssetsDiscovery';
import { expect } from '../common';
import axios from 'axios';
import sinon from 'sinon';
import db from '../../server/db';
import { waitFor } from '../utils/wait';

describe('AssetsDiscovery', () => {
    let assetsDiscovery: AssetsDiscovery;

    beforeEach(() => {
        sinon.stub(axios, 'get');
        assetsDiscovery = new AssetsDiscovery('apps');
    });

    afterEach(async () => {
        assetsDiscovery.stop();
        sinon.restore();
        await db('apps').whereIn('name', ['TestApp', 'App1', 'App2', 'App3', 'AppWithProps']).del();
    });

    it('should not schedule a new iteration when stopped during an iteration', async () => {
        // a negative interval keeps the app due for a refresh, so every iteration requests its assets
        const discovery = new AssetsDiscovery('apps', { intervalSeconds: -10 });
        const axiosGet = axios.get as sinon.SinonStub;
        let finishRequest: (value: unknown) => void = () => {};
        axiosGet.onFirstCall().returns(new Promise((resolve) => (finishRequest = resolve)));
        axiosGet.resolves({ data: { spaBundle: 'bundle.js' } });

        await db('apps').insert({
            name: 'TestApp',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'oldBundle.js',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
        });

        try {
            discovery.start(50);
            await waitFor(async () => axiosGet.called);

            discovery.stop();
            finishRequest({ data: { spaBundle: 'bundle.js' } });
            await new Promise((resolve) => setTimeout(resolve, 300));

            expect(axiosGet.callCount).to.equal(1);
        } finally {
            discovery.stop();
        }
    });

    it('should update the database if assets have changed', async () => {
        (axios.get as any).resolves({
            data: { spaBundle: 'newBundle.js', cssBundle: 'newStyle.css' },
        });

        await db('apps').insert({
            name: 'TestApp',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'oldBundle.js',
            cssBundle: 'oldStyle.css',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
        });

        assetsDiscovery.start(200);

        // since the process is async we need to wait for record is updated, but not more than expected timings
        await waitFor(async () => {
            let app = await db('apps').where('name', 'TestApp').first();
            return app?.assetsDiscoveryUpdatedAt != null;
        });

        const updatedApp = await db('apps').where('name', 'TestApp').first();
        expect(updatedApp).to.include({
            spaBundle: 'http://example.com/newBundle.js',
            cssBundle: 'http://example.com/newStyle.css',
        });
    });

    it('should not write to the database when the assets are unchanged', async () => {
        // a negative interval keeps every app due for a refresh, so each iteration compares them again
        const discovery = new AssetsDiscovery('apps', { intervalSeconds: -1 });
        const axiosGet = axios.get as sinon.SinonStub;
        const manifests: Record<string, object> = {
            'http://example.com/assets1': { spaBundle: 'bundle.js' }, // no cssBundle, no dependencies
            'http://example.com/assets2': { spaBundle: 'bundle.js', dependencies: { react: 'react.js' } },
            'http://example.com/assets3': { spaBundle: 'bundle.js' }, // stopped publishing cssBundle
        };
        axiosGet.callsFake((url: string) => Promise.resolve({ data: manifests[url] }));

        await db('apps').insert([
            {
                name: 'App1',
                assetsDiscoveryUrl: 'http://example.com/assets1',
                spaBundle: 'http://example.com/bundle.js',
                cssBundle: null,
                dependencies: null,
                assetsDiscoveryUpdatedAt: null,
                kind: 'regular',
            },
            {
                name: 'App2',
                assetsDiscoveryUrl: 'http://example.com/assets2',
                spaBundle: 'http://example.com/bundle.js',
                cssBundle: null,
                dependencies: JSON.stringify({ react: 'http://example.com/react.js' }),
                assetsDiscoveryUpdatedAt: null,
                kind: 'regular',
            },
            {
                name: 'App3',
                assetsDiscoveryUrl: 'http://example.com/assets3',
                spaBundle: 'http://example.com/bundle.js',
                cssBundle: 'http://example.com/old.css',
                dependencies: null,
                assetsDiscoveryUpdatedAt: null,
                kind: 'regular',
            },
        ]);

        try {
            discovery.start(50);
            await waitFor(async () => axiosGet.callCount >= 6);
        } finally {
            discovery.stop();
        }

        const apps = await db('apps').whereIn('name', ['App1', 'App2', 'App3']);
        expect(apps).to.have.length(3);
        for (const app of apps) {
            expect(app.assetsDiscoveryUpdatedAt).to.be.null;
        }
        expect(apps.find((app) => app.name === 'App3')?.cssBundle).to.equal('http://example.com/old.css');
    });

    it('should clear an asset the manifest explicitly sets to null', async () => {
        (axios.get as any).resolves({ data: { spaBundle: 'bundle.js', cssBundle: null } });

        await db('apps').insert({
            name: 'TestApp',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'http://example.com/bundle.js',
            cssBundle: 'http://example.com/old.css',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
        });

        assetsDiscovery.start(50);
        await waitFor(async () => {
            const app = await db('apps').where('name', 'TestApp').first();
            return app?.assetsDiscoveryUpdatedAt != null;
        });

        const updatedApp = await db('apps').where('name', 'TestApp').first();
        expect(updatedApp).to.include({
            spaBundle: 'http://example.com/bundle.js',
            cssBundle: null,
        });
    });

    it('should not request the manifest again within the interval when the assets are unchanged', async () => {
        const axiosGet = axios.get as sinon.SinonStub;
        axiosGet.resolves({ data: { spaBundle: 'bundle.js' } });

        await db('apps').insert({
            name: 'TestApp',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'http://example.com/bundle.js',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
        });

        assetsDiscovery.start(50);
        await waitFor(async () => axiosGet.callCount >= 1);
        await new Promise((resolve) => setTimeout(resolve, 300));

        expect(axiosGet.callCount).to.equal(1);
    });

    it('should update the database for successful requests even if one request fails', async () => {
        const appsToCreate = [
            {
                name: 'App1',
                assetsDiscoveryUrl: 'http://example.com/assets1',
                spaBundle: 'oldBundle1.js',
                cssBundle: 'oldStyle1.css',
                kind: 'regular' as const,
                assetsDiscoveryUpdatedAt: null,
            },
            {
                name: 'App2',
                assetsDiscoveryUrl: 'http://example.com/assets2',
                spaBundle: 'oldBundle2.js',
                cssBundle: 'oldStyle2.css',
                kind: 'regular' as const,
                assetsDiscoveryUpdatedAt: null,
            },
            {
                name: 'App3',
                assetsDiscoveryUrl: 'http://example.com/assets3',
                spaBundle: 'oldBundle3.js',
                cssBundle: 'oldStyle3.css',
                kind: 'regular' as const,
                assetsDiscoveryUpdatedAt: null,
            },
        ];
        await db('apps').insert(appsToCreate);

        const appToFail = appsToCreate[1];
        (axios.get as any).callsFake((url: string) => {
            if (url === appToFail.assetsDiscoveryUrl) {
                return Promise.reject(new Error(`Network error fetching assets for ${appToFail.name}`));
            }

            return Promise.resolve({ data: { spaBundle: 'newBundle.js', cssBundle: 'newStyle.css' } });
        });

        assetsDiscovery.start(200);

        await waitFor(async () => {
            let apps = await db('apps').whereIn(
                'name',
                appsToCreate.map((a) => a.name),
            );
            return apps.every((app) =>
                app.name === appToFail.name
                    ? app.assetsDiscoveryUpdatedAt === null
                    : app.assetsDiscoveryUpdatedAt != null,
            );
        }, 1000);

        const apps = await db('apps').whereIn(
            'name',
            appsToCreate.map((a) => a.name),
        );
        expect(apps).to.have.length(3);
        for (const app of apps) {
            if (app.name === appToFail.name) {
                expect(app.spaBundle).to.equal('oldBundle2.js');
                expect(app.cssBundle).to.equal('oldStyle2.css');
                expect(app.assetsDiscoveryUpdatedAt).to.be.null;
            } else {
                expect(app.spaBundle).to.equal('http://example.com/newBundle.js');
                expect(app.cssBundle).to.equal('http://example.com/newStyle.css');
                expect(app.assetsDiscoveryUpdatedAt).not.to.be.null;
            }
        }
    });

    it('should include base64-encoded props in the assets discovery URL when props are present', async () => {
        const appProps = { config: { apiKey: 'test123', enabled: true } };
        const propsJson = JSON.stringify(appProps);
        const propsBase64 = Buffer.from(propsJson).toString('base64');
        const expectedUrl = `http://example.com/assets?appProps=${propsBase64}`;

        let capturedUrl: string | undefined;
        (axios.get as any).callsFake((url: string) => {
            capturedUrl = url;
            return Promise.resolve({ data: { spaBundle: 'newBundle.js', cssBundle: 'newStyle.css' } });
        });

        await db('apps').insert({
            name: 'AppWithProps',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'oldBundle.js',
            cssBundle: 'oldStyle.css',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
            props: propsJson,
        });

        assetsDiscovery.start(200);

        await waitFor(async () => {
            let app = await db('apps').where('name', 'AppWithProps').first();
            return app?.assetsDiscoveryUpdatedAt != null;
        });

        // Verify that axios.get was called with the URL including base64-encoded props
        expect(capturedUrl).to.equal(expectedUrl);

        const updatedApp = await db('apps').where('name', 'AppWithProps').first();
        expect(updatedApp).to.include({
            spaBundle: 'http://example.com/newBundle.js',
            cssBundle: 'http://example.com/newStyle.css',
        });
    });

    it('should not append props to URL when props are empty object', async () => {
        const expectedUrl = 'http://example.com/assets';

        let capturedUrl: string | undefined;
        (axios.get as any).callsFake((url: string) => {
            capturedUrl = url;
            return Promise.resolve({ data: { spaBundle: 'newBundle.js', cssBundle: 'newStyle.css' } });
        });

        await db('apps').insert({
            name: 'AppWithProps',
            assetsDiscoveryUrl: 'http://example.com/assets',
            spaBundle: 'oldBundle.js',
            cssBundle: 'oldStyle.css',
            assetsDiscoveryUpdatedAt: null,
            kind: 'regular',
            props: JSON.stringify({}), // Empty props object
        });

        assetsDiscovery.start(200);

        await waitFor(async () => {
            let app = await db('apps').where('name', 'AppWithProps').first();
            return app?.assetsDiscoveryUpdatedAt != null;
        });

        // Verify that axios.get was called WITHOUT appProps query param
        expect(capturedUrl).to.equal(expectedUrl);
    });
});
