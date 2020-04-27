const path = require('path');

module.exports = {
    'all': true,
    'reporter': [
        'html',
    ],
    'check-coverage': true,
    'branches': 95,
    'lines': 95,
    'functions': 95,
    'statements': 95,
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
        '**/*.config.js',
        'newrelic.js',
        '.karma_output',
        'public',
        'config',
        'build',
        'systemjs',
        'node_modules'
    ]
}
