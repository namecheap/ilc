const stream = require('stream');
const zlib = require('zlib');
const util = require('util');
const gunzip = util.promisify(zlib.gunzip);
const _ = require('lodash');

const helpers = require('../helpers');

module.exports = class StringifierStream extends stream.Transform {
    #placeholder = '<!-- %systemjs-importmap% -->';
    #replaced = false;

    constructor(bundleVersionOverrides, registry, cdnUrl = null) {
        super({objectMode: true});

        this.__bundleVersionOverrides = bundleVersionOverrides;
        this.__registry = registry;
        this.__cdnUrl = cdnUrl;
    }

    _transform(chunk, encoding, done) {
        this.#transformAsync(chunk, encoding)
            .then(() => done())
            .catch(err => this.destroy(err));
    }

    #transformAsync = async (chunk, encoding) => {
        chunk = chunk.toString();

        if (chunk.indexOf(this.#placeholder) === -1 || this.#replaced === true
        ) {
            return this.push(chunk);
        }

        const registryConf = await this.__registry.getConfig();

        const regConf = _.defaultsDeep({}, {apps: await this.#decode(this.__bundleVersionOverrides)}, registryConf.data);

        const tpl =
            helpers.getSystemjsImportmap(regConf.apps) +
            helpers.getSPAConfig(regConf) +
            `<script src="${this.__cdnUrl === null ? '' : this.__cdnUrl}/client.js" type="text/javascript"></script>`;

        chunk = chunk.replace(this.#placeholder, tpl);

        this.#replaced = true;

        this.push(chunk);
    };

    #decode = async (overridesMap) => {
        const res = {};

        for (let ii in overridesMap) {
            if (!overridesMap.hasOwnProperty(ii)) {
                continue;
            }

            const unzipped = (await gunzip(Buffer.from(overridesMap[ii], 'base64'))).toString('utf-8');

            res[ii] = _.pick(JSON.parse( unzipped ), ['spaBundle', 'cssBundle', 'dependencies']);
        }

        return res;
    };
};