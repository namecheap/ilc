const { I } = inject();

export function clickOnLink(url: string, waitForIt = false) {
    const selector = `a[href="${url}"]`;

    if (waitForIt) {
        I.waitForElement(selector, 10);
    }

    I.click(selector);
    I.waitInUrl(url, 10);
    I.waitForDetached('.ilcSpinnerWrapper', 10);
}
