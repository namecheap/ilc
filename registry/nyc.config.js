module.exports = {
    extends: '@istanbuljs/nyc-config-typescript',
    all: true,
    reporter: ['html', 'text', 'json-summary'],
    'check-coverage': false,
    'report-dir': '.nyc_output/coverage',
    lines: 90,
    'per-file': true,
    exclude: ['**/*.spec.ts', '**/*.d.ts', 'config', 'build', 'node_modules', 'client', 'tests', 'nyc.config.js'],
};
