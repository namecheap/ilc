const selectSlotsToRegister = (routes) => routes.map((route) => route.slots).reduce((slotsList, currentSlots) => {
    const currentSlotsEntries = Object.entries(currentSlots).reduce((currentSlotsEntries, [currentSlotName, currentSlot]) => {
        const isSlotAlreadyExisted = slotsList.some((slots) => Object.entries(slots).some(([
            slotName,
            slot,
        ]) => slotName === currentSlotName && currentSlot.appName === slot.appName));

        if (isSlotAlreadyExisted) {
            return currentSlotsEntries;
        }

        return [
            ...currentSlotsEntries,
            [currentSlotName, currentSlot],
        ];
    }, []);

    if (!currentSlotsEntries.length) {
        return slotsList;
    }

    return [
        ...slotsList,
        [...currentSlotsEntries].reduce((obj, [key, val]) => {
            obj[key] = val
            return obj
        }, {}),
    ];
}, []);

export default selectSlotsToRegister;
