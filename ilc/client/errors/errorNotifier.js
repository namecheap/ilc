export default function (err, errInfo) {
    if (window.newrelic && window.newrelic.noticeError) {
        window.newrelic.noticeError(err, JSON.stringify(errInfo));
    }
    console.error(errInfo);
}
