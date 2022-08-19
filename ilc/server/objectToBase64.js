const objectToBase64 = (object) => Buffer.from(JSON.stringify(object)).toString('base64');

module.exports = {
    objectToBase64,
}
