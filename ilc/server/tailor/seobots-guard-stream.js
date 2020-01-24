const stream = require('stream');
const BotDetector = require('device-detector-js/dist/parsers/bot');
const botDetector = new BotDetector();

/**
 * The goals of this stream is to change behaviour of the Tailor when dealing with SEO/SM bots.
 * While it's ok to not to throw an error if non-primary fragment fails when dealing with browser -
 * it's not acceptable to bots. This is because browser can attempt to render missing page
 * parts at he client while bots can't do so due to the limited JS support.
 *
 * @type {module.StringifierStream}
 */
module.exports = class StringifierStream extends stream.Transform {
    statusCode;
    #response;
    #isBot = false;
    #fragmentsCounter = 0;
    #fragmentFound = false;
    #batch = [];
    #erroredState = false;
    #writeHeadArgs = null;

    constructor(reqHeaders, res) {
        super({objectMode: true, autoDestroy: true});
        this.#isBot = botDetector.parse(reqHeaders['user-agent']) !== null;
        this.#response = res;
    }

    _transform(chunk, encoding, done) {
        if (!this.#isBot) {
            this.push(chunk, encoding);
            return done();
        }

        // Stop accepting new data in errored state.
        // Default error handler should generate response
        if (this.#erroredState) {
            return done();
        }

        this.#batch.push(chunk);

        if (this.#fragmentsCounter === 0 && this.#fragmentFound) {
            this.#flushBuffer();
        }

        done();
    }

    _flush(done) {
        if (this.#erroredState) { //Not allowing to send broken response to Bot
            this.#batch = [];
            this.end();
            return;
        }

        this.#flushBuffer();
        done();
    }

    addFragment(fragment) {
        if (!this.#isBot) {
            return;
        }

        this.#fragmentsCounter++;
        this.#fragmentFound = true;

        fragment.once('response', () => this.#fragmentsCounter--);
        fragment.prependOnceListener('error', this.#handleFragmentError)
    }

    /**
     * Not allowing to write headers before all fragments will respond if dealing with Bot
     * Handling case when we received them from primary fragment & non-primary one fails afterwards.
     * @param args
     * @returns {*}
     */
    writeHead(...args) {
        if (!this.#isBot) {
            return this.#response.writeHead(...args);
        }

        this.#writeHeadArgs = args;

        return this.#response;
    }

    #flushBuffer = () => {
        this.#flushHead();
        this.#batch.forEach(v => this.push(v));
        this.#batch = [];
    };

    #flushHead = () => {
        if (this.statusCode) {
            this.#response.statusCode = this.statusCode;
        }
        if (this.#writeHeadArgs !== null) {
            this.#response.writeHead(...this.#writeHeadArgs);
            this.#writeHeadArgs = null;
        }
    };

    #handleFragmentError = () => {
        if (!this.#erroredState) {
            this.emit('error', new Error('Fragment error while processing request from SEO/SM bot. See adjacent messages for real cause.'));
        }

        this.#erroredState = true;
        this.#batch = [];
    }
};
