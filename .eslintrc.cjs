/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    extends: [
        'plugin:vue/vue3-essential',
        'eslint:recommended',
        '@vue/eslint-config-typescript',
        '@vue/eslint-config-prettier/skip-formatting',
        'standard',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    plugins: ['import'],
    rules: {
        'no-debugger': 'error', // 禁止在代码中使用 debugger
        quotes: ['error', 'single'], // 单引号
        semi: ['error', 'always'], // 代码需要以分号结尾
        indent: ['error', 4, { SwitchCase: 1 }],
        'space-before-function-paren': [
            'error',
            {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always',
            },
        ],
        'comma-dangle': ['error', 'always-multiline'],
        'func-call-spacing': 'off',
        'import/order': [
            'error',
            {
                groups: ['type', 'builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            },
        ],
    },
};
