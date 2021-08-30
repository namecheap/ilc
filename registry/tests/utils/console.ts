// used to not flood log in terminal
const originalError = console.error;

export const muteConsole = () => {
    console.error = () => {};
};

export const unmuteConsole = () => {
    console.error = originalError;
};
