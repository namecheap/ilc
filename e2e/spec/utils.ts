const { I } = inject();

export function clickOnLink(url: string, waitForIt = false) {
    const selector = `a[href="${url}"]`;

    if (waitForIt) {
        I.waitForClickable(selector, 10);
    }

    I.click(selector);
    I.waitUrlEquals(url, 10);
    I.waitForDetached('.ilcSpinnerWrapper', 10);
}
