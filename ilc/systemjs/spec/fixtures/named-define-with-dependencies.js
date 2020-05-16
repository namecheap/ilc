(function(define){
    define('named-define-with-dependencies', [
        './named-define-dependency.js',
    ], function() {
        return {
            hi: 'from named defined module with dependencies',
        };
    });
})((window.ILC && window.ILC.define) || window.define);
