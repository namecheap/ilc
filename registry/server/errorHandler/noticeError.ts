import newrelic from 'newrelic';

function noticeError(error: Error, errorInfo = {}): void {
    const additionalInfo = Object.assign({}, errorInfo);

    newrelic.noticeError(error, additionalInfo);

    console.error(
        JSON.stringify({
            type: error.name,
            message: error.message,
            stack: (error?.stack ?? '').split('\n'),
            additionalInfo,
        }),
    );
}

export default noticeError;
