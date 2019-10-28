import singleSpaHtml from './single-spa-html-tpl';
import tpl from './tpl.ejs'

const htmlLifecycles = singleSpaHtml({
    template: tpl,
});

export const bootstrap = htmlLifecycles.bootstrap;
export const mount = htmlLifecycles.mount;
export const unmount = htmlLifecycles.unmount;