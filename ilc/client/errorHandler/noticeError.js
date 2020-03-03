let ilcAlreadyCrashed = false;

window.addEventListener('ilc:crash', () => ilcAlreadyCrashed = true);

export default function (err, errInfo) {
    if (ilcAlreadyCrashed) {
        console.info(`Ignoring error as we already crashed...\n${err.stack}`);
        return; // Ignoring all consequent errors after crash
    }

    const infoData = Object.assign(errInfo);
    if (err.data) {
        Object.assign(infoData, err.data);
    }

    if (window.newrelic && window.newrelic.noticeError && canBeSentToNewRelic(err)) {
        window.newrelic.noticeError(err, infoData);
    }

    console.error(JSON.stringify({
        type: err.name,
        message: err.message,
        stack: err.stack.split("\n"),
        additionalInfo: infoData,
    }), err);
}

const msgRegexps = [
    /^Application '.+?' died in status LOADING_SOURCE_CODE: Failed to fetch$/
];
// The goal here is to ignore some errors that are "OK". And may happen due to conditions that we cannot change.
function canBeSentToNewRelic(err) {
    for (let regex of msgRegexps) {
        if (regex.test(err.message)) {
            return false;
        }
    }

    return true;
}
