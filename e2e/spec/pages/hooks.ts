const { I } = inject();

export const url = {
    entry: '/hooks/',
    protected: '/hooks/protected/',
};

export const goToEntryPage = `body > div#body a.system-link[href="${url.entry}"]`;
export const goToProtectedPage = `body > div#body a.system-link[href="${url.protected}"]`;

export const confirmDialog = `body > dialog[open]`;
export const confirmDialogButtonProceed = `${confirmDialog} > form > button[value="yes"]`;
export const confirmDialogButtonCancel = `${confirmDialog} > form > button[value="no"]`;
