/**
 * NOTE: We override `modules` to "commonjs" for Karma tests only.
 *
 * Our production build outputs ES modules (ESM). In ESM, named exports are
 * live, read-only bindings and the module namespace object is non-writable
 * and non-configurable by specification.
 *
 * Sinon stubs work by redefining properties on imported modules. When code
 * is compiled as ESM, attempting to stub a named export throws errors like:
 *
 *   "Descriptor for property <fn> is non-configurable and non-writable"
 *
 * Forcing CommonJS here makes exports mutable again (matching the old
 * ts-loader behavior) so Sinon can safely stub exported functions in tests.
 *
 * This override is intentionally limited to Karma/test builds.
 * Production bundles remain ESM.
 */
const modules = process.env.NODE_ENV === 'test' ? 'commonjs' : 'auto';

module.exports = {
    presets: [['@babel/preset-env', { modules }], '@babel/preset-typescript'],
    plugins: [
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
