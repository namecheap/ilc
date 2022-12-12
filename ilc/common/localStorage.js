// https://git.coolaj86.com/coolaj86/local-storage.js
// forked because "if(global.localStorage)" throw error if localStorage is disabled in browser

// NOTE:
// this varies from actual localStorage in some subtle ways

// also, there is no persistence
// TODO persist
(function () {
    'use strict';

    var db;

    function LocalStorage() {
        console.warn('Since localStorage is disabled or unsupported in the current browser we use polyfill');
    }
    db = LocalStorage;

    db.prototype.getItem = function (key) {
        if (this.hasOwnProperty(key)) {
            return String(this[key]);
        }
        return null;
    };

    db.prototype.setItem = function (key, val) {
        this[key] = String(val);
    };

    db.prototype.removeItem = function (key) {
        delete this[key];
    };

    db.prototype.clear = function () {
        var self = this;
        Object.keys(self).forEach(function (key) {
            self[key] = undefined;
            delete self[key];
        });
    };

    db.prototype.key = function (i) {
        i = i || 0;
        return Object.keys(this)[i];
    };

    db.prototype.__defineGetter__('length', function () {
        return Object.keys(this).length;
    });

    //https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js
    try {
        var mod = 'testLocalStorage';
        localStorage.setItem(mod, mod);
        localStorage.removeItem(mod);
        module.exports = localStorage;
    } catch (e) {
        module.exports = new LocalStorage();
    }
})();
