/**
 * WARNING! Code was taken from https://github.com/CanopyTax/single-spa-html/blob/v1.0.0/src/single-spa-html.js
 */

import template from 'lodash.template';

const defaultOpts = {
    template: "",
    domElementGetter: null
};

export default function singleSpaHtml(opts) {
    if (!opts) {
        throw Error(`single-spa-html must be called with an opts object`);
    }

    opts = { ...defaultOpts, ...opts };

    if (typeof opts.template !== "string" || opts.template.trim().length === 0) {
        throw Error(
            `single-spa-html must be passed a 'template' opt that is a non empty string`
        );
    }

    opts.template = template(opts.template);

    if (opts.domElementGetter && typeof opts.domElementGetter !== "function") {
        throw Error(
            `single-spa-html was given 'opts.domElementGetter', but it isn't a function`
        );
    }

    // Just a shared object to store the mounted object state
    let mountedObjects = {};

    return {
        bootstrap: bootstrap.bind(null, opts),
        mount: mount.bind(null, opts, mountedObjects),
        unmount: unmount.bind(null, opts, mountedObjects)
    };
}

function bootstrap(opts, props) {
    return Promise.resolve();
}

function mount(opts, mountedObjects, props) {
    return Promise.resolve().then(() => {
        const domElementGetter = chooseDomElementGetter(opts, props);
        const domEl = domElementGetter();
        if (!domEl) {
            throw Error(
                `single-spa-html: domElementGetter did not return a valid dom element`
            );
        }

        mountedObjects.domEl = domEl;

        if (domEl.firstElementChild && domEl.firstElementChild.hasAttribute('data-ssr-content')) {
            return;
        }

        domEl.innerHTML = opts.template(props);
    });
}

function unmount(opts, mountedObjects, props) {
    return Promise.resolve().then(() => {
        if (mountedObjects.domEl) {
            mountedObjects.domEl.innerHTML = '';
            delete mountedObjects.domEl;
        }
    });
}

function chooseDomElementGetter(opts, props) {
    if (props.domElement) {
        return () => props.domElement;
    } else if (props.domElementGetter) {
        return props.domElementGetter;
    } else if (opts.domElementGetter) {
        return opts.domElementGetter;
    } else {
        return defaultDomElementGetter(props);
    }
}

function defaultDomElementGetter(props) {
    const htmlId = `single-spa-application:${props.appName || props.name}`;
    if (!htmlId) {
        throw Error(
            `single-spa-html was not given an application name as a prop, so it can't make a unique dom element container for the ht l application`
        );
    }

    return function defaultDomEl() {
        let domElement = document.getElementById(htmlId);
        if (!domElement) {
            domElement = document.createElement("div");
            domElement.id = htmlId;
            document.body.appendChild(domElement);
        }

        return domElement;
    };
}