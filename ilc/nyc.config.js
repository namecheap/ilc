const path = require('path');

module.exports = {
    all: true,
    reporter: ['html', 'text', 'json-summary'],
    'check-coverage': true,

    branches: 0,
    lines: 0,
    functions: 0,
    statements: 0,

    'per-file': true,
    'report-dir': path.join(__dirname, '.nyc_output', 'coverage'),
    'skip-full': true,
    watermarks: {
        lines: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        statements: [80, 95],
    },
    include: ['common/**', 'server/**'],
    exclude: ['**/*.spec.js', '**/*.spec.ts', '**/*.conf.js', '**/*.config.js', '**/*.d.ts', 'common/**/*.js'],
};
