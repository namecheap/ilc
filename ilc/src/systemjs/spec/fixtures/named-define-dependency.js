(function(define){
    define('named-define-dependency', [], function() {
        return {
            hi: 'from named defined dependency module',
        };
    });
})((window.ILC && window.ILC.define) || window.define);
