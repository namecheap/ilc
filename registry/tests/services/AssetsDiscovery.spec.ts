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
        sinon.restore();
        await db('apps').whereIn('name', ['TestApp', 'App1', 'App2', 'App3', 'AppWithProps']).del();
        assetsDiscovery.stop();
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
