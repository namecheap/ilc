(function(define){
    define([], function() {
        return {
            hi: 'from anonymous defined module',
        };
    });
})((window.ILC && window.ILC.define) || window.define);
