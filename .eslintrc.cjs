module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  extends: ['eslint:recommended', 'plugin:promise/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['promise'],
  rules: {
    'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_' }],
    'promise/always-return': 'off',
    'promise/catch-or-return': ['error', { allowFinally: true }],
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/valid-params': 'warn'
  }
};
