export default {
    NOT_FOUND: 'ilc:404',
    BEFORE_ROUTING: 'ilc:before-routing',
    ALL_SLOTS_LOADED: 'ilc:all-slots-loaded',
    CRASH: 'ilc:crash',
    INTL_UPDATE : 'ilc:intl-update',
    PAGE_READY: 'ilc:page-ready',
    updateAppInSlot: (slotName, appName) => `ilc:update:${slotName}_${appName}`,
}
