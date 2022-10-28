import {assert} from '../../client/utils';

export class SpaSlot {
    #applicationId;
    #applicationName;
    #slotName;
    /**
     * @property {IlcConfigRoot}
     */
    #configRoot

    /**
     * @constructor
     * @param {{slotName: string, appName: string, appId: string}} slotName
     * @param {IlcConfigRoot} rootConfig
     */
    constructor({applicationId, applicationName, slotName}, configRoot) {

        assert(applicationId !== 'string', 'SpaSlot instance can not be initiated without applicationId');
        assert(applicationName !== 'string', 'SpaSlot instance can not be initiated without applicationName');
        assert(slotName !== 'string', 'SpaSlot instance can not be initiated without slotName');

        this.#applicationId = applicationId;
        this.#applicationName = applicationName;
        this.#slotName = slotName;
        this.#configRoot = configRoot;
    }

    /**
     * @method
     * @return {string} ApplicationName
     */
    getApplicationName() {
        return this.#applicationName;
    }

    /**
     * @method
     * @return {string} ApplicationId
     */
    getApplicationId() {
        return this.#applicationId;
    }

    /**
     * @method
     * @return {string} getSlotName
     */
    getSlotName() {
        return this.#slotName;
    }


    /**
     * @method
     * @description Method return is slot is associated with valid application
     * @return {boolean}
     */
    isValid(){
        return !!this.#configRoot.getConfigForAppByName(this.#applicationName);
    }

    /**
     * @method
     * @return {{slotName: string, appName: string, appId: string}}
     */
    toJSON() {
        return {
            appId: this.getApplicationId(),
            appName: this.getApplicationName(),
            slotName: this.getSlotName(),
        }
    }
}
