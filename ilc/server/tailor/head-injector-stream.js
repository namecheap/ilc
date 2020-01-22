const stream = require('stream');

module.exports = class StringifierStream extends stream.Transform {
    constructor(primaryFragmentHeaders) {
        super({objectMode: true});

        this.__title = primaryFragmentHeaders['x-head-title'] !== undefined
            ? Buffer.from(primaryFragmentHeaders['x-head-title'], 'base64').toString('utf-8')
            : '';
        this.__meta = primaryFragmentHeaders['x-head-meta'] !== undefined
            ? Buffer.from(primaryFragmentHeaders['x-head-meta'], 'base64').toString('utf-8')
            : '';
        this.__injected = false;
        this.__titleRe = /<title>.*<\/title>/is;
    }

    _transform(chunk, encoding, done) {
        if (this.__injected || (this.__title === '' && this.__meta === '')) {
            this.push(chunk);
            return done();
        }

        let schunk = chunk.toString();
        let insertPosStart, insertPosEnd;

        const titleMatch = this.__titleRe.exec(schunk);
        if (titleMatch !== null) {
            insertPosStart = titleMatch.index;
            insertPosEnd = insertPosStart + titleMatch[0].length;
        } else {
            const pos = schunk.indexOf('</head>');
            if (pos !== -1) {
                insertPosStart = pos;
                insertPosEnd = insertPosStart;
            }
        }

        if (insertPosStart !== undefined) {
            schunk = schunk.substring(0, insertPosStart) + this.__title + this.__meta + schunk.substring(insertPosEnd);
            this.__injected = true;
        }

        this.push(schunk);
        done();
    }
};