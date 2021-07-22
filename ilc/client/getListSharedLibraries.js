let sharedLibs = null;

export default () => {
    if (sharedLibs !== null) {
        return sharedLibs;
    }

    const sharedLibsScript = document.querySelector('script[data-ilc-shared-libraries]');

    if (sharedLibsScript) {
        try {
            sharedLibs = JSON.parse(sharedLibsScript.innerHTML).imports;

            for (const key in sharedLibs) {
                if (key.startsWith('@sharedLibrary/')) {
                    delete sharedLibs[key];
                }
            }
        } catch (e) {
            console.error('Script tag of shared-libraries was found but its not JSON compatible')
        }
    }

    return sharedLibs;
};
