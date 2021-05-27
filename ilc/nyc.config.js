const path = require('path');

module.exports = {
    'all': true,
    'reporter': [
        'html',
        'text',
    ],
    'check-coverage': true,

    'branches': 0,
    'lines': 0,
    'functions': 0,
    'statements': 0,

    'per-file': true,
    'report-dir': path.join(__dirname, '.nyc_output', 'coverage'),
    'skip-full': true,
    'watermarks': {
        'lines': [
            80,
            95
        ],
        'functions': [
            80,
            95
        ],
        'branches': [
            80,
            95
        ],
        'statements': [
            80,
            95
        ]
    },
    'exclude': [
        '**/*.spec.js',
        '**/*.conf.js',
        '**/*.config.js',
        'newrelic.js',
        '.karma_output',
        'client',
        'public',
        'config',
        'build',
        'systemjs',
        'node_modules',
    ]
}
