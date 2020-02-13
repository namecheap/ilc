module.exports = {
    presets: [
        '@babel/preset-env',
    ],
    ignore: [
        /@babel[\/\\]runtime/
    ],
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-transform-literals',
        [
            '@babel/plugin-transform-runtime', {
                regenerator: true,
            }
        ]
    ],
    sourceType: 'unambiguous'
};
