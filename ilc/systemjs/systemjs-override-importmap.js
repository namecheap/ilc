/*
 * SystemJS module info extension
 */
(function () {
    const System = window.System;
    const systemJSPrototype = System.constructor.prototype;

    systemJSPrototype.overrideImportMap = function (id, url) {
        let oldUrl;
        try {
            oldUrl = systemJSPrototype.resolve(id);
        } catch {}

        if (oldUrl && oldUrl === url) {
            return;
        } else if (oldUrl) {
            System.delete(oldUrl);
        }

        const script = document.createElement('script');
        script.type = 'systemjs-importmap';
        script.text = JSON.stringify({ imports: { [id]: url } });
        document.head.append(script);

        System.prepareImport(true);
    };
})();
