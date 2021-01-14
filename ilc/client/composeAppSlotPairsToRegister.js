import {makeAppId} from '../common/utils';

const composeAppSlotPairsToRegister = (registryConf) => {
    const data = {};

    const routes = [...registryConf.routes, registryConf.specialRoutes['404']];
    routes.forEach(route => {
        for (const slotName in route.slots) {
            if (!route.slots.hasOwnProperty(slotName)) {
                continue;
            }
            const slot = route.slots[slotName];

            const appId = makeAppId(slot.appName, slotName);

            if (!data[appId]) {
                data[appId] = {
                    appId,
                    appName: slot.appName,
                    slotName,
                }
            }
        }
    });

    return Object.values(data);
}

export default composeAppSlotPairsToRegister;
