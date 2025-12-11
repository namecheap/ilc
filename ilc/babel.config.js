module.exports = {
    presets: ['@babel/preset-env'],
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        'babel-plugin-transform-async-to-promises',
        [
            '@babel/plugin-transform-for-of',
            {
                /**
                 * Babel converts for...of into using Symbol.iterator by default
                 * We have an issue with that when we try to open the app with the help of old browsers
                 *
                 * @see {@link https://babeljs.io/docs/en/babel-plugin-transform-for-of#assumearray}
                 * @see {@link https://daverupert.com/2017/10/for-of-loops-are-bad/}
                 */
                assumeArray: true,
            },
        ],
    ],
    sourceType: 'unambiguous',
    env: {
        test: {
            plugins: [
                [
                    'istanbul',
                    {
                        exclude: ['**/*.spec.js', '**/*.spec.ts', 'tests/**', 'common/**/test/**'],
                    },
                ],
            ],
        },
    },
};
