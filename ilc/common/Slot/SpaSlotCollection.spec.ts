import { expect } from 'chai';
import { SpaSlotCollection } from './SpaSlotCollection';

interface SpaSlot {
    getApplicationId(): string;
    getApplicationName(): string;
    getSlotName(): string;
    isValid(): boolean;
    toJSON(): { appId: string; appName: string; slotName: string };
}

interface RouteSlot {
    appName: string;
    props: Record<string, unknown>;
    kind: string | null;
}

interface Route {
    routeId: number;
    route: string;
    slots: Record<string, RouteSlot>;
}

interface AppConfig {
    kind?: string;
    spaBundle: string;
    cssBundle?: string;
    ssr?: unknown[];
    dependencies?: unknown[];
}

interface MockConfigRoot {
    getConfigForRoutes: () => Route[];
    getConfigForSpecialRoutesByKey: (key: string) => Route | null;
    getConfigForAppByName: (appName: string) => AppConfig | null;
}

interface RawSlotJSON {
    appId: string;
    appName: string;
    slotName: string;
}

describe('SpaSlotCollection', () => {
    let mockConfigRoot: MockConfigRoot;

    beforeEach(() => {
        mockConfigRoot = {
            getConfigForRoutes: (): Route[] => [
                {
                    routeId: 1,
                    route: '/',
                    slots: {
                        navbar: {
                            appName: '@portal/navbar',
                            props: {},
                            kind: null,
                        },
                        body: {
                            appName: '@portal/people',
                            props: {},
                            kind: null,
                        },
                    },
                },
                {
                    routeId: 2,
                    route: '/news/*',
                    slots: {
                        navbar: {
                            appName: '@portal/navbar',
                            props: {},
                            kind: null,
                        },
                        body: {
                            appName: '@portal/news',
                            props: {},
                            kind: null,
                        },
                    },
                },
            ],
            getConfigForSpecialRoutesByKey: (key: string): Route | null => {
                if (key === '404') {
                    return {
                        routeId: 404,
                        route: '*',
                        slots: {
                            navbar: {
                                appName: '@portal/navbar',
                                props: {},
                                kind: null,
                            },
                            body: {
                                appName: '@portal/notfound',
                                props: {},
                                kind: null,
                            },
                        },
                    };
                }
                return null;
            },
            getConfigForAppByName: (appName: string): AppConfig | null => {
                const validApps: Record<string, AppConfig> = {
                    '@portal/navbar': {
                        kind: 'essential',
                        spaBundle: 'http://localhost:8235/navbar.js',
                    },
                    '@portal/people': {
                        kind: 'primary',
                        spaBundle: 'http://localhost:8236/people.js',
                    },
                    '@portal/news': {
                        kind: 'primary',
                        spaBundle: 'http://localhost:8239/news.js',
                    },
                    '@portal/notfound': {
                        kind: 'primary',
                        spaBundle: 'http://localhost:8240/notfound.js',
                    },
                };
                return validApps[appName] || null;
            },
        };
    });

    describe('constructor', () => {
        it('should create a SpaSlotCollection instance and process all routes', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);

            expect(collection).to.be.instanceOf(SpaSlotCollection);
        });

        it('should create SpaSlot instances for all unique slots across routes', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            // Should have unique slots based on appName + slotName combination
            // navbar__at__navbar appears in multiple routes but should be counted once
            // body slot appears with different apps, so each should be unique
            expect(slots.length).to.be.greaterThan(0);
        });

        it('should deduplicate slots with same applicationId across routes', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            // Get all applicationIds
            const appIds = slots.map((slot: SpaSlot) => slot.getApplicationId());

            // Check that all appIds are unique (no duplicates)
            const uniqueAppIds = [...new Set(appIds)];
            expect(appIds.length).to.equal(uniqueAppIds.length);
        });

        it('should include slots from 404 route', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            // Check if 404 route's slots are included
            const notFoundSlot = slots.find((slot: SpaSlot) => slot.getApplicationName() === '@portal/notfound');
            expect(notFoundSlot).to.exist;
        });

        it('should create SpaSlot instances with correct properties', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            slots.forEach((slot: SpaSlot) => {
                expect(slot.getApplicationId()).to.be.a('string');
                expect(slot.getApplicationName()).to.be.a('string');
                expect(slot.getSlotName()).to.be.a('string');
            });
        });
    });

    describe('getSlotCollection', () => {
        it('should return an array of SpaSlot instances', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            expect(slots).to.be.an('array');
            expect(slots.length).to.be.greaterThan(0);
        });

        it('should return the same collection on multiple calls', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots1 = collection.getSlotCollection();
            const slots2 = collection.getSlotCollection();

            expect(slots1).to.equal(slots2);
        });

        it('should return slots with valid applications', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            const validSlots = slots.filter((slot: SpaSlot) => slot.isValid());
            expect(validSlots.length).to.equal(slots.length);
        });
    });

    describe('getSlotCollectionRaw', () => {
        it('should return an array of JSON objects', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const rawSlots = collection.getSlotCollectionRaw();

            expect(rawSlots).to.be.an('array');
            expect(rawSlots.length).to.be.greaterThan(0);
        });

        it('should return objects with appId, appName, and slotName properties', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const rawSlots = collection.getSlotCollectionRaw();

            rawSlots.forEach((rawSlot: RawSlotJSON) => {
                expect(rawSlot).to.have.property('appId');
                expect(rawSlot).to.have.property('appName');
                expect(rawSlot).to.have.property('slotName');
                expect(rawSlot.appId).to.be.a('string');
                expect(rawSlot.appName).to.be.a('string');
                expect(rawSlot.slotName).to.be.a('string');
            });
        });

        it('should return serialized versions of slot collection', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();
            const rawSlots = collection.getSlotCollectionRaw();

            expect(rawSlots.length).to.equal(slots.length);

            // Verify that each raw slot corresponds to a slot
            rawSlots.forEach((rawSlot: RawSlotJSON, index: number) => {
                expect(rawSlot.appId).to.equal(slots[index].getApplicationId());
                expect(rawSlot.appName).to.equal(slots[index].getApplicationName());
                expect(rawSlot.slotName).to.equal(slots[index].getSlotName());
            });
        });
    });

    describe('slot deduplication', () => {
        it('should not duplicate slots when same app appears in multiple routes', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            // navbar appears in all routes but should only be counted once per slot
            const navbarSlots = slots.filter((slot: SpaSlot) => slot.getApplicationName() === '@portal/navbar');
            expect(navbarSlots.length).to.equal(1);
        });

        it('should create different slots for same slotName with different apps', () => {
            const collection = new SpaSlotCollection(mockConfigRoot);
            const slots = collection.getSlotCollection();

            // body slot appears with @portal/people, @portal/news, and @portal/notfound
            const bodySlots = slots.filter((slot: SpaSlot) => slot.getSlotName() === 'body');
            expect(bodySlots.length).to.equal(3);

            // Verify they have different app names
            const appNames = bodySlots.map((slot: SpaSlot) => slot.getApplicationName());
            const uniqueAppNames = [...new Set(appNames)];
            expect(uniqueAppNames.length).to.equal(3);
        });
    });

    describe('edge cases', () => {
        it('should handle routes with no slots', () => {
            const emptyConfigRoot: MockConfigRoot = {
                getConfigForRoutes: (): Route[] => [
                    {
                        routeId: 1,
                        route: '/',
                        slots: {},
                    },
                ],
                getConfigForSpecialRoutesByKey: (): Route => ({
                    routeId: 404,
                    route: '*',
                    slots: {},
                }),
                getConfigForAppByName: (): null => null,
            };

            const collection = new SpaSlotCollection(emptyConfigRoot);
            const slots = collection.getSlotCollection();

            expect(slots).to.be.an('array');
            expect(slots.length).to.equal(0);
        });

        it('should handle single route with single slot', () => {
            const singleSlotConfigRoot: MockConfigRoot = {
                getConfigForRoutes: (): Route[] => [
                    {
                        routeId: 1,
                        route: '/',
                        slots: {
                            navbar: {
                                appName: '@portal/navbar',
                                props: {},
                                kind: null,
                            },
                        },
                    },
                ],
                getConfigForSpecialRoutesByKey: (): Route => ({
                    routeId: 404,
                    route: '*',
                    slots: {},
                }),
                getConfigForAppByName: (appName: string): AppConfig | null => {
                    if (appName === '@portal/navbar') {
                        return { spaBundle: 'http://localhost:8235/navbar.js' };
                    }
                    return null;
                },
            };

            const collection = new SpaSlotCollection(singleSlotConfigRoot);
            const slots = collection.getSlotCollection();

            expect(slots.length).to.equal(1);
            expect(slots[0].getApplicationName()).to.equal('@portal/navbar');
            expect(slots[0].getSlotName()).to.equal('navbar');
        });
    });
});
