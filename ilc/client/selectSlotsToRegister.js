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
        Object.fromEntries(currentSlotsEntries),
    ];
}, []);

export default selectSlotsToRegister;
