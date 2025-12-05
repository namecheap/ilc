import { makeAppId } from '../utils';
import { SpaSlot } from './SpaSlot';

export class SpaSlotCollection {
    /**
     * @private
     * @property {Array<SpaSlot>}
     */
    #slotCollection = [];

    /**
     * @param {IlcConfigRoot} configRoot
     */
    constructor(configRoot) {
        const routes = configRoot.getConfigForRoutes();
        const route404 = configRoot.getConfigForSpecialRoutesByKey('404');
        const slotRoutes = [...routes, route404];

        const slotCollectionMap = new Map();

        slotRoutes.forEach((route) => {
            const routeSlots = route.slots;
            const routeSlotsName = Object.keys(routeSlots);

            routeSlotsName.forEach((slotName) => {
                const rawSlot = route.slots[slotName];
                const applicationId = makeAppId(rawSlot.appName, slotName);
                const slot = new SpaSlot(
                    {
                        applicationId,
                        applicationName: rawSlot.appName,
                        slotName,
                    },
                    configRoot,
                );

                // Routes could contain overrides for slots
                // So it leads to situation when slot route could be duplicated per route
                if (!slotCollectionMap.get(applicationId)) {
                    slotCollectionMap.set(applicationId, slot);
                }
            });
        });

        this.#slotCollection = Array.from(slotCollectionMap.values());
    }

    /**
     * @public
     * @return Array<SpaSlot>
     */
    getSlotCollection() {
        return this.#slotCollection;
    }

    /**
     * @public
     * @return Array<{slotName: string, appName: string, appId: string}>
     */
    getSlotCollectionRaw() {
        return this.#slotCollection.map((item) => item.toJSON());
    }
}
