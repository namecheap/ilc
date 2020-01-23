const fragment = require('node-tailor/lib/fragment');

/**
 * WARNING: Original source code was taken from v3.9.2 https://github.com/zalando/tailor/blob/ab689b3897afe337358802649a2fc18fd79a3711/lib/fragment.js
 */
fragment.prototype.insertStart = function () {
    const { async: isAsync, id } = this.attributes;
    this.styleRefs.forEach(uri => {
        this.stream.write(
            isAsync
                ? `<script>${this
                    .pipeInstanceName}.loadCSS("${uri}")</script>`
                : `<link rel="stylesheet" href="${uri}" data-fragment-id="${id}">`
        );
    });

    if (this.scriptRefs.length === 0) {
        this.stream.write(
            `<script data-pipe>${this.pipeInstanceName}.start(${this
                .index})</script>`
        );
        this.index++;
        return;
    }

    const range = [this.index, this.index + this.scriptRefs.length - 1];
    const fragmentId = id || range[0];
    const attributes = Object.assign({}, this.pipeAttributes, {
        id: fragmentId,
        range
    });
    this.scriptRefs.forEach(uri => {
        this.stream.write(
            `<script data-pipe>${this.pipeInstanceName}.start(${this
                .index}, "${uri}", ${JSON.stringify(attributes)})</script>`
        );
        this.index++;
    });
}

/**
 * Layout composer uses incorect format of Headers.Link
 * so we should transform Layout composer format to correct which is used by Tailor
 */
const transformLink = headerLink => {
    return headerLink
    .split(',')
    .map(link => {
        return link
        .split(';')
        .map((attribute, index) => {
            if (index) {
                const [key, value] = attribute.split('=');
                return `${key}="${value}"`;
            } else {
                return `<${attribute}>`;
            }
        })
        .join('; ');
    })
    .join(',');
};

const { onResponse } = fragment.prototype;

fragment.prototype.onResponse = function (response) {
    const link = response.headers.link;
    const xAmzMetaLink = response.headers['x-amz-meta-link'];

    if (link && !link.startsWith('<')) {
        response.headers.link = transformLink(link);
    }

    if (xAmzMetaLink && !xAmzMetaLink.startsWith('<')) {
        response.headers['x-amz-meta-link'] = transformLink(xAmzMetaLink);
    }

    onResponse.apply(this, arguments);
};

/**
 * Here we're disabling Tailor's feature of "fallback-src" for fragments.
 * While this is a neat thing - we don't have any alternative for client side.
 */
const fetchOrig = fragment.prototype.fetch;
fragment.prototype.fetch = function () {
    this.attributes.fallbackUrl = undefined;
    return fetchOrig.apply(this, arguments);
};

