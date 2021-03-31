module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    // "indent": ["error", "tab"],
    'no-trailing-spaces': ['error'],
    'no-var': 'error',
    'no-console': 'off',
    'linebreak-style': ['error', 'unix'],
  },
}
