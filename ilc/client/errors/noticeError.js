export default function (err, errInfo) {
    const infoData = Object.assign(errInfo);
    if (err.data) {
        Object.assign(infoData, err.data);
    }

    if (window.newrelic && window.newrelic.noticeError) {
        window.newrelic.noticeError(err, infoData);
    }

    console.error(JSON.stringify({
        type: error.name,
        message: error.message,
        stack: error.stack.split("\n"),
        additionalInfo: infoData,
    }));
}
