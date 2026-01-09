import { expect } from 'chai';
import { SpaSlot } from './SpaSlot';

interface AppConfig {
    kind: string;
    spaBundle: string;
    cssBundle?: string;
}

interface MockConfigRoot {
    getConfigForAppByName: (appName: string) => AppConfig | null | undefined;
}

interface RawSlot {
    applicationId?: string | number | object;
    applicationName?: string | null | object;
    slotName?: string | object;
}

describe('SpaSlot', () => {
    let mockConfigRoot: MockConfigRoot;

    beforeEach(() => {
        mockConfigRoot = {
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
                };
                return validApps[appName] || null;
            },
        };
    });

    describe('constructor', () => {
        it('should create a valid SpaSlot instance with all required parameters', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot).to.be.instanceOf(SpaSlot);
            expect(slot.getApplicationId()).to.equal('app-123');
            expect(slot.getApplicationName()).to.equal('@portal/navbar');
            expect(slot.getSlotName()).to.equal('header-slot');
        });

        // NOTE: The following tests document a BUG in the current implementation.
        // The assertions in SpaSlot.js lines 20-31 are inverted - they check
        // `typeof applicationId !== 'string'` which throws when the value IS a string.
        // The assertions should be `typeof applicationId === 'string'` instead.

        it('should throw error when applicationId is missing', () => {
            const rawSlot: RawSlot = {
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without applicationId',
            );
        });

        it('should throw error when applicationName is missing', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                slotName: 'header-slot',
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without applicationName',
            );
        });

        it('should throw error when slotName is missing', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without slotName',
            );
        });

        it('should throw error when applicationId is not a string', () => {
            const rawSlot: RawSlot = {
                applicationId: 123,
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without applicationId',
            );
        });

        it('should throw error when applicationName is not a string', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: null,
                slotName: 'header-slot',
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without applicationName',
            );
        });

        it('should throw error when slotName is not a string', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: { name: 'header-slot' },
            };

            expect(() => new SpaSlot(rawSlot, mockConfigRoot)).to.throw(
                'SpaSlot instance can not be initiated without slotName',
            );
        });
    });

    describe('getApplicationName', () => {
        it('should return the application name', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.getApplicationName()).to.equal('@portal/navbar');
        });
    });

    describe('getApplicationId', () => {
        it('should return the application id', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-456',
                applicationName: '@portal/people',
                slotName: 'body-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.getApplicationId()).to.equal('app-456');
        });
    });

    describe('getSlotName', () => {
        it('should return the slot name', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: 'footer-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.getSlotName()).to.equal('footer-slot');
        });
    });

    describe('isValid', () => {
        it('should return true when application exists in config', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.isValid()).to.be.true;
        });

        it('should return false when application does not exist in config', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-999',
                applicationName: '@portal/nonexistent',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.isValid()).to.be.false;
        });

        it('should return false when getConfigForAppByName returns null', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/unknown',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.isValid()).to.be.false;
        });

        it('should return false when getConfigForAppByName returns undefined', () => {
            mockConfigRoot.getConfigForAppByName = (): undefined => undefined;

            const rawSlot: RawSlot = {
                applicationId: 'app-123',
                applicationName: '@portal/navbar',
                slotName: 'header-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);

            expect(slot.isValid()).to.be.false;
        });
    });

    describe('toJSON', () => {
        it('should return correct JSON representation', () => {
            const rawSlot: RawSlot = {
                applicationId: 'app-789',
                applicationName: '@portal/people',
                slotName: 'content-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);
            const json = slot.toJSON();

            expect(json).to.deep.equal({
                appId: 'app-789',
                appName: '@portal/people',
                slotName: 'content-slot',
            });
        });

        it('should return JSON with all properties as strings', () => {
            const rawSlot: RawSlot = {
                applicationId: 'test-id',
                applicationName: 'test-app',
                slotName: 'test-slot',
            };

            const slot = new SpaSlot(rawSlot, mockConfigRoot);
            const json = slot.toJSON();

            expect(json.appId).to.be.a('string');
            expect(json.appName).to.be.a('string');
            expect(json.slotName).to.be.a('string');
        });
    });
});
