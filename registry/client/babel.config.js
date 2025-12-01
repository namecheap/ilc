const presets = [
    [
        '@babel/preset-env',
        {
            targets: {
                firefox: '101',
                chrome: '100',
                safari: '16.0',
            },
            useBuiltIns: 'usage',
            corejs: 3,
        },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
];

const plugins = [];

module.exports = { presets, plugins };
