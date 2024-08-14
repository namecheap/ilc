export function waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 3000,
    interval: number = 100,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setInterval(async () => {
            if (await condition()) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
        setTimeout(() => {
            clearInterval(timer);
            reject(new Error(`Timeout ${timeout}ms exceeded`));
        }, timeout);
    });
}
