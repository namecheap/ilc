import { SpaSlotCollection } from '../common/Slot/SpaSlotCollection';

/**
 *
 * @param {IlcConfigRoot} rootConfig
 * @return {Array<Slot>}
 */
const composeAppSlotPairsToRegister = (rootConfig) => {
    const slotCollection = new SpaSlotCollection(rootConfig);
    return slotCollection.getSlotCollection();
};

export default composeAppSlotPairsToRegister;
