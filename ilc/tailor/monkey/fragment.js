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