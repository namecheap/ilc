const presets = [
    [
        '@babel/env',
        {
            targets: {
                firefox: '74',
                chrome: '80',
                safari: '13.0',
            },
            useBuiltIns: 'usage',
            corejs: 3,
        },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
];

const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-syntax-dynamic-import',
];

module.exports = { presets, plugins };
