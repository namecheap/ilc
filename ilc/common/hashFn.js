function hashFn(str) {
    if (typeof str !== 'string') {
        throw new Error(`The provided parameter ${str} into the hash function has the type of ${typeof str} and should have the type of string!`);
    }

    for(var i = 0, h = 0xdeadbeef; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString();
}

module.exports = hashFn;
